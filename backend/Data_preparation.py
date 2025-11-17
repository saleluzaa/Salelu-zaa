# -*- coding: utf-8 -*-
import numpy as np
import pandas as pd
import holidays
import json
import os

if not hasattr(np, "NaN"):
    np.NaN = np.nan

# ---------------------------------------------------------
# 1) คอลัมน์ที่จำเป็น + รองรับ hour_of_day
# ---------------------------------------------------------
REQUIRED_CONCEPTS = {
    "date_col": {
        "display_name": "Date",
        "aliases": ["date", "timestamp", "order date", "datetime"]
    },
    "money_col": {
        "display_name": "Money",
        "aliases": ["money", "price", "total", "revenue", "amount"]
    },
    "item_col": {
        "display_name": "Coffee Name",
        "aliases": ["coffee_name", "menu_name", "item", "menu", "product"]
    },
    "hour_col": {
        "display_name": "Hour of Day",
        "aliases": ["hour_of_day", "hour", "time_hour"]
    }
}

EXPECTED_DATE_FORMAT = "%Y-%m-%d"

# ---------------------------------------------------------
# 2) หา column จาก alias
# ---------------------------------------------------------
def find_column_mappings(df_columns):
    column_map = {}
    missing = []

    df_cols_lower = {col.lower().strip(): col for col in df_columns}

    for concept, details in REQUIRED_CONCEPTS.items():
        found = False
        for alias in details["aliases"]:
            if alias in df_cols_lower:
                column_map[concept] = df_cols_lower[alias]
                found = True
                break
        if not found:
            # hour_of_day ไม่บังคับ
            if concept != "hour_col":
                missing.append(details["display_name"])

    return column_map, missing

# ---------------------------------------------------------
# 3) ทำความสะอาดข้อมูล
# ---------------------------------------------------------
def clean_raw_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    column_map, missing = find_column_mappings(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    date_col = column_map["date_col"]
    money_col = column_map["money_col"]
    item_col = column_map["item_col"]
    hour_col = column_map.get("hour_col", None)

    # Date
    df[date_col] = pd.to_datetime(df[date_col], format=EXPECTED_DATE_FORMAT, errors="raise")

    # Money
    df[money_col] = (
        df[money_col]
        .astype(str)
        .str.replace(",", "")
        .str.replace('"', "")
        .str.strip()
        .astype(float)
    )

    # Item
    df[item_col] = df[item_col].astype(str).str.strip()

    # Hour (optional)
    if hour_col:
        df[hour_col] = pd.to_numeric(df[hour_col], errors="coerce")

    # Rename
    df = df.rename(columns={
        date_col: "Date",
        money_col: "money",
        item_col: "coffee_name",
        hour_col: "hour_of_day" if hour_col else None
    })

    df["Weekdaysort"] = df["Date"].dt.weekday + 1
    df["Monthsort"] = df["Date"].dt.month

    return df

# ---------------------------------------------------------
# 4) Group รายวัน
# ---------------------------------------------------------
def build_daily_from_raw(raw_df: pd.DataFrame) -> pd.DataFrame:
    daily = (
        raw_df
        .groupby(["Date", "Weekdaysort", "Monthsort", "coffee_name"])
        .agg(
            Amount_of_Sale=("coffee_name", "count"),
            Total_Revenue=("money", "sum")
        )
        .reset_index()
    )
    daily = daily.rename(columns={
        "coffee_name": "Menu_Name",
        "Weekdaysort": "Weeksort"
    })
    return daily

# ---------------------------------------------------------
# 5) Feature Engineering
# ---------------------------------------------------------
def add_features(daily: pd.DataFrame) -> pd.DataFrame:
    df = daily.copy()
    df["Date"] = pd.to_datetime(df["Date"])

    # holiday
    min_year = df["Date"].min().year
    max_year = df["Date"].max().year
    th_holidays = holidays.TH(years=range(min_year, max_year+1))
    holiday_df = pd.DataFrame.from_dict(th_holidays, orient="index", columns=["Holiday"])
    holiday_df.index = pd.to_datetime(holiday_df.index)

    df = df.join(holiday_df, on="Date")
    df["is_holiday"] = df["Holiday"].notnull().astype(int)
    df.drop(columns=["Holiday"], inplace=True)

    # Sort + shift
    df = df.sort_values(["Menu_Name", "Date"])
    df["day_number"] = (df["Date"] - df["Date"].min()).dt.days
    df["sale_yesterday"] = df.groupby("Menu_Name")["Amount_of_Sale"].shift(1).fillna(0)
    df["sale_last_week"] = df.groupby("Menu_Name")["Amount_of_Sale"].shift(7).fillna(0)
    df["is_weekend"] = df["Weeksort"].isin([6,7]).astype(int)

    return df

# ---------------------------------------------------------
# 6) Main Pipeline
# ---------------------------------------------------------
def get_prepared_data(csv_path: str) -> pd.DataFrame:
    raw = pd.read_csv(csv_path)
    raw_clean = clean_raw_data(raw)

    # ---------------------
    # Business Insight JSON
    # ---------------------

    # Best menu / worst menu
    menu_sum = raw_clean.groupby("coffee_name")["money"].sum().sort_values(ascending=False)
    best_menu = menu_sum.index[0]
    worst_menu = menu_sum.index[-1]

    # Best day / worst day
    day_map = {1:"Mon",2:"Tue",3:"Wed",4:"Thu",5:"Fri",6:"Sat",7:"Sun"}
    day_sum = raw_clean.groupby("Weekdaysort")["money"].sum()
    day_sum.index = day_sum.index.map(day_map)

    best_day = day_sum.idxmax()
    worst_day = day_sum.idxmin()

    # Hourly insight (if available)
    if "hour_of_day" in raw_clean.columns:
        hourly = raw_clean.dropna(subset=["hour_of_day"])
        if len(hourly):
            hour_sales = hourly.groupby("hour_of_day")["money"].sum().sort_values(ascending=False)
            best_hour = f"{int(hour_sales.index[0]):02d}:00"
            worst_hour = f"{int(hour_sales.index[-1]):02d}:00"
            info = "Hourly sales generated from 'hour_of_day' column."
        else:
            best_hour = worst_hour = "Not Available (empty hour data)"
            info = "hour_of_day column exists but no usable data."
    else:
        best_hour = worst_hour = "Not Available (no hour_of_day column)"
        info = "CSV contains no hour_of_day column."

    insight = {
        "best_menu": best_menu,
        "best_menu_total_revenue": float(menu_sum.max()),
        "worst_menu": worst_menu,
        "best_day_of_week": best_day,
        "worst_day_of_week": worst_day,
        "best_hour": best_hour,
        "worst_hour": worst_hour,
        "info": info
    }

    with open("summary_insight.json", "w", encoding="utf-8") as f:
        json.dump(insight, f, indent=4, ensure_ascii=False)

    # continue to daily features
    daily = build_daily_from_raw(raw_clean)
    daily_feat = add_features(daily)

    # group
    high_sellers = ["Latte","Americano","Espresso","Cappuccino","Mocha"]
    if best_menu not in high_sellers:
        high_sellers.append(best_menu)

    daily_feat["Menu_Group"] = "Low_Sellers"
    daily_feat.loc[daily_feat["Menu_Name"].isin(high_sellers), "Menu_Group"] = "High_Sellers"

    return daily_feat
