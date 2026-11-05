HYPEKYTE GSTIN API INTEGRATION

1. Make a backup of your existing backend/gstin.py and backend/main.py.
2. Replace backend/gstin.py with the gstin.py in this folder.
3. Replace backend/main.py with the main.py in this folder.
4. Confirm backend/.env contains:
   GSTIN_API_KEY=your_actual_key
   Do not share this key or commit .env to Git.
5. Ensure backend/requirements.txt includes:
   requests
   python-dotenv
6. Restart FastAPI after saving the files.
7. Test /health, then submit a verification from the frontend.

IMPORTANT:
- The sandbox GSTIN 00AAAAA0000A1ZT returns test data. The integration labels
  this as SANDBOX_TEST and never treats it as real GST registration evidence.
- Real GSTIN lookup requires an actual GSTIN and provider account/credits.
- An Active GSTIN record does not establish applicant ownership or authority.
- scoring.py is intentionally unchanged.
