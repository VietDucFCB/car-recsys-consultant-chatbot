/*
  Dimension: listing × image. Restricted to listings present in fct_listing.

  image_url is the PUBLIC GCS URL of the image the crawler downloaded + uploaded
  to gs://incremental_raw/dt=<crawl_date>/images/post_images/<vin>/<image_order>.jpg
  (bucket is public-read). The app serves images from our own GCS, NOT cars.com —
  cars.com CDN URLs 404 once a listing is sold. source_image_url keeps the
  original cars.com URL for reference/debugging only.
*/
select
    fl.listing_sk,
    li.vin,
    li.image_order,
    'https://storage.googleapis.com/incremental_raw/dt='
        || to_char(li.crawl_date, 'YYYY-MM-DD')
        || '/images/post_images/' || li.vin
        || '/' || li.image_order || '.jpg'      as image_url,
    li.source_image_url
from {{ ref('stg_listing_images') }} li
join {{ ref('fct_listing') }} fl
    on md5(li.vin) = fl.listing_sk
