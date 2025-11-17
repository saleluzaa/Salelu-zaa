from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import json
from flaml import AutoML
from sklearn.model_selection import train_test_split

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/autoML")
async def autoML(csv_file: UploadFile = File(...)):

    if not csv_file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload .csv file only")

    os.makedirs("uploads", exist_ok=True)
    csv_path = os.path.join("uploads", csv_file.filename)

    with open(csv_path, "wb") as f:
        f.write(await csv_file.read())

    from Data_preparation import get_prepared_data

    daily_feat = get_prepared_data(csv_path)

    feature_cols = [
        "Weeksort","Monthsort","Menu_Name","sale_yesterday","sale_last_week",
        "is_weekend","is_holiday"
    ]

    daily_feat["Menu_Name"] = daily_feat["Menu_Name"].astype("category")
    daily_feat["Menu_Group"] = daily_feat["Menu_Group"].astype("category")

    menu_groups = daily_feat["Menu_Group"].unique()
    all_models = {}
    all_future_predictions = []

    for group in menu_groups:
        group_data = daily_feat[daily_feat["Menu_Group"] == group].copy()
        group_data["Menu_Name"] = group_data["Menu_Name"].cat.remove_unused_categories()

        if len(group_data) < 100:
            continue

        X = group_data[feature_cols]
        y = group_data["Amount_of_Sale"]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

        automl = AutoML()
        automl.fit(X_train=X_train, y_train=y_train, task="regression", metric="r2", time_budget=40)
        all_models[group] = automl

    # Predict future
    def forecast(model, menu_name, days=30):
        hist = daily_feat[daily_feat["Menu_Name"] == menu_name].copy()
        if hist.empty:
            return None

        hist = hist.sort_values("Date")
        last_date = hist["Date"].iloc[-1]

        future = []
        sales = list(hist["Amount_of_Sale"])

        for i in range(1, days+1):
            new_date = last_date + pd.Timedelta(days=i)
            row = {
                "Weeksort": new_date.weekday()+1,
                "Monthsort": new_date.month,
                "Menu_Name": menu_name,
                "sale_yesterday": sales[-1],
                "sale_last_week": sales[-7] if len(sales)>=7 else 0,
                "is_weekend": 1 if (new_date.weekday()+1 in [6,7]) else 0,
                "is_holiday": 0
            }
            X = pd.DataFrame([row])
            pred = max(0, round(model.predict(X)[0]))
            sales.append(pred)
            future.append({"Date": str(new_date.date()), "Predicted_Sale": pred})

        return future

    for menu in daily_feat["Menu_Name"].unique():
        gp = daily_feat[daily_feat["Menu_Name"]==menu]["Menu_Group"].iloc[0]
        if gp in all_models:
            pred = forecast(all_models[gp], menu)
            if pred:
                all_future_predictions.extend(pred)

    df = pd.DataFrame(all_future_predictions)
    overall = df.groupby("Date")["Predicted_Sale"].sum().reset_index()

    return {"overall_future_sales": overall.to_dict(orient="records")}

@app.get("/summary")
async def summary():
    path = "summary_insight.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Run /autoML first")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
    
