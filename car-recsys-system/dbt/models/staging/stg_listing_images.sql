/*
  Explodes post.image[] into one row per (vin, image_order).
  WITH ORDINALITY preserves the gallery order (image_order = the {n}.jpg the
  crawler saved to GCS at dt=<crawl_date>/images/post_images/<vin>/<n>.jpg).

  crawl_date is carried down so dim_listing_image can build the public GCS URL.
  The original cars.com CDN url is kept as source_image_url for reference only
  (it 404s once the listing is sold — that's why the app no longer uses it).
*/
with raw as (
    select vin, crawl_date, payload from {{ ref('stg_raw_latest') }}
)

select
    raw.vin,
    img.ord::int            as image_order,
    raw.crawl_date,
    img.url                 as source_image_url
from raw,
     lateral jsonb_array_elements_text(
         coalesce(raw.payload->'post'->'image', '[]'::jsonb)
     ) with ordinality as img(url, ord)
where jsonb_typeof(raw.payload->'post'->'image') = 'array'
  and img.url is not null
  and img.url <> ''
  and raw.crawl_date is not null
