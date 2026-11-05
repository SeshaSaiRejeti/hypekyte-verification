from google_places import search_business

results = search_business(
    "Haldiram",
    "Sonipat, Haryana"
)

for business in results:
    print(business)