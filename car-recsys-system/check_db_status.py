#!/usr/bin/env python3
import psycopg2
import sys

try:
    conn = psycopg2.connect(
        host='localhost',
        database='car_recsys',
        user='admin',
        password='admin123'
    )
    cur = conn.cursor()
    
    print('\n' + '='*80)
    print('🔍 DATABASE STATUS CHECK')
    print('='*80)
    
    tables = [
        ('used_vehicles', 'Xe đã qua sử dụng'),
        ('new_vehicles', 'Xe mới'),
        ('sellers', 'Đại lý/Người bán'),
        ('reviews_ratings', 'Đánh giá & Nhận xét'),
        ('vehicle_features', 'Tính năng xe'),
        ('vehicle_images', 'Hình ảnh xe'),
        ('seller_vehicle_relationships', 'Quan hệ Seller-Vehicle')
    ]
    
    total = 0
    for table, desc in tables:
        try:
            cur.execute(f'SELECT COUNT(*) FROM raw.{table}')
            count = cur.fetchone()[0]
            total += count
            status = '✅' if count > 0 else '❌'
            print(f'{status} {table:35s}: {count:>15,} rows  ({desc})')
        except Exception as e:
            print(f'❌ {table:35s}: ERROR - {e}')
    
    print('='*80)
    print(f'   {"📊 TỔNG CỘNG":35s}: {total:>15,} rows')
    print('='*80 + '\n')
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'\n❌ Không thể kết nối database: {e}\n')
    sys.exit(1)
