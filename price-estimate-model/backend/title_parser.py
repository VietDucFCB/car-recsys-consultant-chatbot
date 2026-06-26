"""
==============================================================
  title_parser.py — Module parse title xe robust cho mọi input format
  
  Thiết kế để hoạt động đúng với CẢ HAI trường hợp:
    1. Dữ liệu training: "Acura Integra A-SPEC Technology"
    2. Inference (user nhập): "Toyota Camry 2.5Q", "Camry SE",
       "2023 Toyota Camry SE", "Toyota Camry SE AWD", etc.
  
  Output features từ title:
    - model_name     : tên model (Civic, Wrangler, Range Rover, Model 3…)
    - trim           : phiên bản còn lại sau brand+model
    - drivetrain     : AWD / FWD / RWD / Unknown (extracted từ title)
    - is_ev_hybrid   : 1 nếu có EV/hybrid/4xe/plug-in
    - is_4x4         : 1 nếu có 4x4 / Rubicon / Trail / off-road
    - brand_model    : "{brand}_{model}" dùng làm feature tổng hợp
==============================================================
"""

import re
import pandas as pd
import numpy as np

# ── BRAND DICTIONARY ─────────────────────────────────────────
# Multi-word phải đứng trước single-word khi match
MULTI_WORD_BRANDS = [
    'Land Rover', 'Mercedes-Benz', 'Mercedes Benz',
    'Alfa Romeo',
]

# Tất cả brands trong dataset (dùng làm fallback lookup)
KNOWN_BRANDS = [
    'Acura', 'Alfa Romeo', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac',
    'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari', 'Ford', 'Genesis', 'GMC', 'Gmc',
    'Honda', 'Hyundai', 'INEOS', 'Ineos', 'Infiniti', 'Jaguar', 'Jeep',
    'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Maserati', 'Mazda',
    'Mercedes Benz', 'Mercedes-Benz', 'Mini', 'MINI', 'Mitsubishi', 'Nissan',
    'Polestar', 'Porsche', 'Ram', 'Subaru', 'Tesla', 'Toyota',
    'Volkswagen', 'Volvo',
]

# ── MULTI-WORD MODEL DICTIONARY ───────────────────────────────
# Key = brand (lowercase), Value = list of 2-word models (dài trước ngắn)
# Nguồn: phân tích toàn bộ training data
MULTI_WORD_MODELS = {
    'jeep': [
        'Grand Cherokee', 'Grand Wagoneer',
    ],
    'land rover': [
        'Range Rover',       # "Range Rover Sport SE" → model=Range Rover, trim=Sport SE
        'Discovery Sport',
        'Discovery Pro',
    ],
    'tesla': [
        'Model Y', 'Model 3', 'Model S', 'Model X',  # "Model 3 Long Range" → model=Model 3, trim=Long Range
    ],
    'toyota': [
        'Grand Highlander',  # "Grand Highlander Limited"
        '4Runner',           # single-word nhưng có số → xử lý bình thường
    ],
    'gmc': [
        'HUMMER EV',         # "HUMMER EV SUV 2X" → model=HUMMER EV, trim=SUV 2X
        'Sierra 1500',       # Nên giữ nguyên vì 1500/2500/3500 là sub-model
        'Sierra 2500',
        'Sierra 3500',
        'Yukon XL',          # XL là sub-variant của Yukon, khác về kích thước/giá
    ],
    'ford': [
        'F-150',             # single-word nhưng hyphen
        'F-250',
        'F-350',
    ],
    'hyundai': [
        'SANTA FE',          # "SANTA FE HEV SEL Premium" → model=SANTA FE, trim=SEL Premium
        'SANTA Cruz',        # Pickup
    ],
    'mercedes benz': [
        # Mercedes dùng Class names: E-Class, S-Class, GLC, AMG G...
        'E-Class', 'S-Class', 'C-Class', 'GLC', 'GLE', 'GLS',
        'AMG G', 'AMG E', 'AMG C', 'AMG GT',
        'CLA', 'CLS', 'GLB', 'EQS', 'EQE',
    ],
    'mercedes-benz': [
        'E-Class', 'S-Class', 'C-Class', 'GLC', 'GLE', 'GLS',
        'AMG G', 'AMG E', 'AMG C', 'AMG GT',
        'CLA', 'CLS', 'GLB', 'EQS', 'EQE',
    ],
}

# EV/Hybrid tokens cần xóa khỏi trim (đã extract vào is_ev_hybrid)
EV_IN_TRIM = re.compile(
    r'\b(HEV|PHEV|4xe|hybrid|electric|plug.in|e-tron|ioniq|ePHEV|e-POWER)\b',
    re.IGNORECASE
)

# ── KEYWORD PATTERNS ──────────────────────────────────────────
DRIVETRAIN_PATTERN = re.compile(
    r'\b(AWD|FWD|RWD|4WD|4x4|4X4|SH-AWD|xDrive|quattro|ALLGRIP|e-TRAC|i-ACTIV|4MATIC)\b',
    re.IGNORECASE
)

EV_HYBRID_PATTERN = re.compile(
    r'\b(EV|PHEV|4xe|HEV|hybrid|electric|plug.in|e-tron|ioniq|ePHEV|e-POWER)\b',
    re.IGNORECASE
)

# Trim keywords biểu thị off-road capability (ảnh hưởng giá)
OFFROAD_PATTERN = re.compile(
    r'\b(Rubicon|Warthog|Sahara|Moab|Willys|TRD Pro|TRD Off.Road|Raptor|'
    r'Tremor|PowerWagon|Power Wagon|TrailHawk|Trailhawk|AT4|Baja|'
    r'Badlands|Wildtrak|Adventure|Desert Ridge)\b',
    re.IGNORECASE
)

# Tokens cần xóa khỏi trim (thông tin không phân biệt phiên bản)
NOISE_IN_TRIM = re.compile(
    r'\b(with|and|the|plus|pkg|package|edition)\b',
    re.IGNORECASE
)


def _normalize_brand(brand: str) -> str:
    """Chuẩn hóa brand về dạng lưu trong dataset."""
    b = brand.strip()
    # Mercedes-Benz → Mercedes Benz (dạng trong dataset)
    b = re.sub(r'Mercedes[-\s]Benz', 'Mercedes Benz', b, flags=re.IGNORECASE)
    # Viết hoa chữ cái đầu
    return b.title() if b.upper() == b or b.lower() == b else b


def _extract_drivetrain(text: str) -> str:
    m = DRIVETRAIN_PATTERN.search(text)
    if not m:
        return 'Unknown'
    token = m.group(0).upper()
    if token in ('4X4', '4WD'):           return 'AWD'
    if token in ('XDRIVE', 'QUATTRO',
                 'ALLGRIP', 'E-TRAC',
                 'I-ACTIV', '4MATIC'):    return 'AWD'
    if token == 'SH-AWD':                 return 'AWD'
    return token  # AWD / FWD / RWD


def parse_title(title: str, brand_hint: str = None) -> dict:
    """
    Parse title xe thành các feature components.
    
    Parameters
    ----------
    title : str
        Tên xe. Có thể là bất kỳ format nào:
          • "Acura Integra A-SPEC Technology"   (training format)
          • "Toyota Camry 2.5Q"                 (user nhập kèm engine)
          • "Toyota Camry"                      (chỉ brand + model)
          • "Camry SE"                          (không có brand)
          • "2023 Toyota Camry SE"              (có year)
          • "Toyota Camry SE AWD"               (có drivetrain)
    brand_hint : str, optional
        Brand đã biết (ví dụ từ dropdown trên form). Dùng khi
        title không bắt đầu bằng brand name.
    
    Returns
    -------
    dict với các keys:
        brand, model_name, trim, drivetrain,
        is_ev_hybrid, is_offroad, brand_model, full_clean
    """
    title = str(title).strip()

    # ── Bước 1: Xóa year ở đầu (legacy format / user nhập thừa) ──
    title_no_year = re.sub(r'^\d{4}\s+', '', title).strip()
    title_work    = title_no_year

    # ── Bước 2: Extract drivetrain / EV / off-road TRƯỚC khi parse brand ──
    # (để tránh nhầm "FWD" thành một phần của trim)
    drivetrain   = _extract_drivetrain(title_work)
    is_ev_hybrid = 1 if EV_HYBRID_PATTERN.search(title_work) else 0
    is_offroad   = 1 if OFFROAD_PATTERN.search(title_work) else 0

    # ── Bước 3: Match brand ──────────────────────────────────────
    brand_found = None
    rest        = title_work  # phần còn lại sau brand

    # Thử multi-word brand trước (Land Rover, Mercedes Benz…)
    for b in MULTI_WORD_BRANDS:
        if title_work.lower().startswith(b.lower()):
            brand_found = _normalize_brand(b)
            rest        = title_work[len(b):].strip()
            break

    # Thử single-word brand
    if not brand_found:
        for b in KNOWN_BRANDS:
            if ' ' not in b and title_work.lower().startswith(b.lower()):
                brand_found = _normalize_brand(b)
                rest        = title_work[len(b):].strip()
                break

    # Fallback: dùng brand_hint từ form (user chỉ nhập model+trim)
    if not brand_found and brand_hint:
        brand_found = _normalize_brand(brand_hint)
        # Nếu title bắt đầu bằng brand_hint → cắt đi
        if title_work.lower().startswith(brand_hint.lower()):
            rest = title_work[len(brand_hint):].strip()
        else:
            rest = title_work  # title chỉ có model+trim

    if not brand_found:
        brand_found = 'Unknown'

    # ── Bước 4: Match model (multi-word trước) ──────────────────
    brand_key   = brand_found.lower()
    model_found = None
    multi_models = MULTI_WORD_MODELS.get(brand_key, [])

    # Longest match first (đảm bảo "Grand Cherokee" > "Grand")
    for mm in sorted(multi_models, key=len, reverse=True):
        if rest.lower().startswith(mm.lower()):
            model_found = mm                   # Giữ nguyên casing gốc
            rest        = rest[len(mm):].strip()
            break

    # Single-word model
    if not model_found:
        parts = rest.split()
        if parts:
            model_found = parts[0]
            rest        = ' '.join(parts[1:])
        else:
            model_found = 'Unknown'
            rest        = ''

    # ── Bước 5: Làm sạch trim ───────────────────────────────────
    # Xóa drivetrain tokens khỏi trim (đã được extract riêng rồi)
    trim_clean = DRIVETRAIN_PATTERN.sub('', rest).strip()
    # Xóa EV/Hybrid tokens khỏi trim (đã có flag is_ev_hybrid)
    trim_clean = EV_IN_TRIM.sub('', trim_clean).strip()
    # Xóa noise words
    trim_clean = NOISE_IN_TRIM.sub('', trim_clean).strip()
    # Xóa khoảng trắng thừa
    trim_clean = re.sub(r'\s+', ' ', trim_clean).strip()

    trim = trim_clean if trim_clean else 'Base'

    return {
        'brand':       brand_found,
        'model_name':  model_found,
        'trim':        trim,
        'drivetrain':  drivetrain,
        'is_ev_hybrid': is_ev_hybrid,
        'is_offroad':  is_offroad,
        'brand_model': f"{brand_found}_{model_found}",
        'full_clean':  f"{brand_found} {model_found} {trim}".strip(),
    }


def apply_title_features(df: pd.DataFrame, title_col: str = 'title',
                          brand_col: str = 'brand') -> pd.DataFrame:
    """
    Áp dụng parse_title lên toàn bộ DataFrame.
    Dùng cho cả training pipeline và inference pipeline.
    
    Parameters
    ----------
    df         : DataFrame gốc
    title_col  : tên cột chứa title
    brand_col  : tên cột chứa brand (làm hint nếu có)
    
    Returns
    -------
    DataFrame với các cột mới được thêm vào:
        model_name, trim, drivetrain, is_ev_hybrid, is_offroad, brand_model
    """
    df = df.copy()

    parsed = df.apply(
        lambda row: pd.Series(
            parse_title(
                row[title_col],
                brand_hint=row[brand_col] if brand_col in row.index else None
            )
        ),
        axis=1
    )

    # Chỉ lấy các cột feature, không ghi đè cột brand gốc
    df['model_name']   = parsed['model_name']
    df['trim']         = parsed['trim']
    df['drivetrain']   = parsed['drivetrain']
    df['is_ev_hybrid'] = parsed['is_ev_hybrid']
    df['is_offroad']   = parsed['is_offroad']
    df['brand_model']  = parsed['brand_model']

    return df


# ══════════════════════════════════════════════════════════════
# TEST SUITE — chạy trực tiếp để verify
# ══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    import pandas as pd

    TEST_CASES = [
        # (title, brand_hint, expected_model, expected_trim)
        ("Acura Integra A-SPEC Technology",      "Acura",        "Integra",      "A-SPEC Technology"),
        ("Honda Civic EX-L",                     "Honda",        "Civic",        "EX-L"),
        # User format variations
        ("Toyota Camry 2.5Q",                    "Toyota",       "Camry",        "2.5Q"),
        ("Toyota Camry",                         "Toyota",       "Camry",        "Base"),
        ("Camry SE",                             "Toyota",       "Camry",        "SE"),    # Không có brand
        ("2023 Toyota Camry SE",                 None,           "Camry",        "SE"),    # Có year
        ("Toyota Camry SE AWD",                  "Toyota",       "Camry",        "SE"),    # Drivetrain bị tách
        # Multi-word models
        ("Jeep Grand Cherokee Laredo",           "Jeep",         "Grand Cherokee", "Laredo"),
        ("Jeep Grand Cherokee High Altitude",    "Jeep",         "Grand Cherokee", "High Altitude"),
        ("Jeep Grand Wagoneer Series II",        "Jeep",         "Grand Wagoneer", "Series II"),
        ("Land Rover Range Rover Sport SE",      "Land Rover",   "Range Rover",  "Sport SE"),
        ("Land Rover Range Rover Sport Dynamic SE", "Land Rover","Range Rover",  "Sport Dynamic SE"),
        ("Tesla Model 3 Long Range",             "Tesla",        "Model 3",      "Long Range"),
        ("Tesla Model Y Performance",            "Tesla",        "Model Y",      "Performance"),
        ("Toyota Grand Highlander Limited",      "Toyota",       "Grand Highlander", "Limited"),
        # Multi-word brands
        ("Mercedes-Benz E-Class E 450 4MATIC",  "Mercedes Benz","E-Class",      "E 450"),
        ("Mercedes-Benz S-Class 4MATIC",        None,           "S-Class",      "Base"),
        ("Alfa Romeo Giulia Ti",                "Alfa Romeo",   "Giulia",       "Ti"),
        # EV/Hybrid flags
        ("Jeep Wrangler 4xe Rubicon",           "Jeep",         "Wrangler",     "Rubicon"),  # is_ev=1, is_offroad=1
        ("Honda Civic Hybrid Sport",            "Honda",        "Civic",        "Sport"),    # is_ev=1
        ("Hyundai SANTA FE HEV SEL Premium",    "Hyundai",      "SANTA FE",     "SEL Premium"),
        # Edge cases
        ("Ford F-150 XLT",                      "Ford",         "F-150",        "XLT"),
        ("GMC Sierra 1500 Denali",              "Gmc",          "Sierra 1500",  "Denali"),
        ("GMC HUMMER EV SUV 2X",               "Gmc",          "HUMMER EV",    "SUV 2X"),
        ("BMW X5 xDrive40i",                   "BMW",          "X5",           "xDrive40i"),
    ]

    print(f"{'INPUT TITLE':<45} {'BRAND':<15} {'MODEL':<18} {'TRIM':<22} DT       EV  OFF")
    print("-" * 130)

    all_pass = True
    for title, brand_hint, exp_model, exp_trim in TEST_CASES:
        r = parse_title(title, brand_hint)
        ok_model = '✓' if r['model_name'] == exp_model else '✗'
        ok_trim  = '✓' if r['trim'] == exp_trim else '✗'
        status   = '✓' if ok_model == '✓' and ok_trim == '✓' else '✗'
        if status == '✗':
            all_pass = False
        print(f"{title:<45} {r['brand']:<15} {r['model_name']:<18} {r['trim']:<22} "
              f"{r['drivetrain']:<8} {r['is_ev_hybrid']}   {r['is_offroad']}  "
              f"[model:{ok_model} trim:{ok_trim}]")

    print()
    print("✅ Tất cả test pass!" if all_pass else "⚠️  Một số test cần điều chỉnh")

    # ── Demo apply_title_features trên file thực ──────────────
    print("\n" + "="*60)
    print("DEMO: Áp dụng lên dataset thực")
    print("="*60)
    try:
        import os
        csv_path = 'master_car_dataset_update.csv'
        if os.path.exists(csv_path):
            df_demo = pd.read_csv(csv_path).head(10)
            df_demo = apply_title_features(df_demo)
            print(df_demo[['title', 'brand', 'model_name', 'trim', 'drivetrain',
                            'is_ev_hybrid', 'is_offroad']].to_string(index=False))
    except Exception as e:
        print(f"(Bỏ qua demo dataset: {e})")
