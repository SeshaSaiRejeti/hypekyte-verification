# Business Verification API – Research Summary

## 1. Research Summary

| Method | API Available? | Pricing / Sandbox | Information Retrieved | Proves Business Existence? | Proves Applicant Association? | Decision |
|---|---|---|---|---|---|---|
| GSTIN Verification | Yes | Paid APIs; free sandbox options available | Legal name, trade name, GST status, registered address | Yes, supporting evidence | No | Use |
| Google Places API | Yes | Monthly free usage limits; billing required | Business name, address, category, phone, website, ratings | Provides supporting evidence | No | Use as supporting verification |
| Phone OTP | Yes | Paid SMS services generally required | Confirms access to a phone number | No | Partially | Use |
| Business Email Verification | Yes | Can be free | Email and domain validity | No | Partially | Use as supporting verification |

## 2. Google Places API (New)

**Purpose:** Identify businesses through Google Maps listings and compare their publicly available information with submitted registration details.

**API Details:**
- API: Google Places API (New)
- Method: Text Search
- Endpoint: `POST https://places.googleapis.com/v1/places:searchText`
- Authentication: Google API Key
- Requirements: Google Cloud project and billing account.

**Important Fields:**

| Field | Information |
|---|---|
| `places.id` | Unique place identifier |
| `places.displayName` | Business name |
| `places.formattedAddress` | Business address |
| `places.types` | Business category |
| `places.businessStatus` | Operational status |
| `places.nationalPhoneNumber` | Publicly listed phone number |
| `places.websiteUri` | Business website |

**Pricing:**
- Essentials (IDs Only): Unlimited free usage.
- Pro: 35,000 free requests/month.
- Enterprise: 7,000 free requests/month.
- Billing account required, even when using free allowances.
- Pricing depends on the highest-priced field requested.

*Note: These are the researched India-specific pricing figures and should be reconfirmed before implementation.*

**Limitations:**
- Not every business has a Google Maps listing.
- Business information may be outdated.
- A matching listing does not prove applicant ownership or association.

**Decision:** Use Google Places API as a supporting verification method to compare business names, addresses and publicly available contact details.

## 3. GSTIN Verification API Providers

GSTIN verification helps determine whether a business is registered under GST and retrieves its registered business information.

### 3.1 FinAGG – Common GST Search API

- API action: `SEARCHGSTIN`
- Authentication: API Key (`ApiKeyAuth`)
- Sandbox and production environments available.
- Retrieves legal name, trade name, GST registration status and jurisdiction details.
- Published pricing: Approximately ₹0.05 per API call (subject to confirmation).
- Sandbox pricing and free usage limits are not specified.

**Decision:** Potential provider. Confirm sandbox access, production pricing and request limits.

### 3.2 GSTVerify

- REST API with API key authentication (`X-API-Key`).
- Sandbox API key supported.
- Retrieves GSTIN, legal name, registration status and taxpayer details.

**Published Pricing:**
- Free: ₹0/month (20 manual verifications/day).
- Pro: ₹299/month (100 API calls).
- Business: ₹999/month (1,000 API calls).
- Additional credits start at ₹0.10 per credit.

**Limitations:**
- Developer API access under the free plan is unclear.
- Demo credit eligibility needs confirmation.
- GSTIN verification does not establish applicant ownership.

**Decision:** Worth evaluating, but confirm API access and actual usage costs.

### 3.3 APIserver.in – GST Verification API

**API Details:**
- Endpoint: `/v1/gst/verify`
- Input: GSTIN
- Output: JSON response
- Authentication: API key
- Sandbox and production environments available.

**Information Retrieved:**
- GSTIN
- Legal business name
- Trade name
- GST registration status
- Registration date
- Taxpayer type
- Registered business address

**Pricing:**

| Parameter | Details |
|---|---|
| Base price | ₹0.19 per successful call |
| GST | 18% |
| Total price | Approximately ₹0.22 per successful call |
| Failed calls | Advertised as free |
| Setup fee | None advertised |
| Minimum wallet | None advertised |

**Advantages:**
- Free sandbox advertised for testing.
- Pay-per-successful-call pricing.
- No advertised setup fee or annual contract.
- Additional APIs for PAN, MCA and other verification services.

**Limitations:**
- Sandbox data may be simulated.
- Production data accuracy needs testing.
- Exact rate limits and authentication format should be confirmed.
- A valid GSTIN does not prove that the applicant represents the business.

**Decision:** APIserver.in was initially preferred because of its advertised free sandbox and pay-per-successful-call pricing. However, since no response has been received regarding API access, GSTIN API (gstinapi.in) is selected as the preferred alternative for evaluation and integration. Final selection depends on successful API-key generation and sandbox testing.

## 4. Proposed HypeKyte Verification Workflow

1. Business registers on HypeKyte and submits its business details and GSTIN.
2. Backend sends the GSTIN to the selected verification provider.
3. API returns registered business information.
4. HypeKyte compares the legal name, trade name, address and GST status with the submitted details.
5. Google Places API can provide additional supporting evidence.
6. Phone OTP and business email verification help establish the applicant's association.
7. Unclear cases are forwarded for manual review.
8. Verification results and status are stored in the database.

## 5. Important Considerations

- GSTIN verification establishes registration details, not applicant ownership.
- Google Places provides supporting business information, not legal proof of ownership.
- Phone OTP confirms access to a phone number, not necessarily business ownership.
- Business email verification provides additional evidence of association.
- Authorization documents or manual review may be required when the applicant's association cannot be established automatically.

## 6. Final Recommendation

For the initial HypeKyte implementation:

- **Primary verification:** APIserver.in GST Verification API.
- **Supporting verification:** Google Places API.
- **Applicant verification:** Phone OTP and business email verification.
- **Additional verification:** Manual review and authorization documents when necessary.

Before production integration, test the APIserver.in sandbox, verify the actual response format, confirm production pricing and evaluate the accuracy of returned GST information.

## 7. References

- [APIserver.in](https://apiserver.in/)
- [APIserver.in Pricing](https://apiserver.in/pricing)
- [APIserver.in Documentation](https://apiserver.in/docs)
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)


## Phone Verification – OTP Providers

### 1. 2Factor

- **Website:** https://www.2factor.in/
- **Service:** SMS and OTP API
- **API integration:** REST API; SDKs available for multiple programming languages, including Node.js.
- **Features:**
  - Transactional and OTP SMS.
  - API, dashboard and analytics.
  - DLT registration assistance.
  - Growth plan includes priority OTP routes and webhooks.

**Pricing (excluding 18% GST):**
- Starter: ₹0.15/SMS, up to 100,000 SMS/month.
- Growth: ₹0.12/SMS, up to 1 million SMS/month.
- Enterprise: Custom pricing.
- Starter plan has a "Start Free" option; exact free-credit allowance needs confirmation.

**Integration requirements:**
- Account signup and API credentials.
- Check DLT registration and template requirements before production use.
- Verify OTP API endpoints and free-tier conditions.

### 2. Fast2SMS – Bulk SMS

- **Website:** https://www.fast2sms.com/
- **Service:** Bulk SMS API with OTP support.
- **API integration:** REST API.
- **Features:**
  - Supports promotional, transactional and OTP SMS.
  - API and dashboard access.
  - No setup fee or monthly fee.
  - Failed messages are refunded according to the provider's policy.

**Pricing (excluding 18% GST):**
- Starting price: ₹0.25/SMS.
- Rates decrease with higher recharge amounts, down to ₹0.11/SMS.
- Example: ₹4,000 recharge provides approximately 19,047 SMS at ₹0.21/SMS.
- Recharge starts at ₹100.
- ₹50 free credit on signup.
- Wallet balance does not expire; the rate is valid for six months.

**Integration requirements:**
- Account signup and API credentials.
- Check DLT registration and template requirements.
- Confirm that signup credits can be used for OTP messages.

### Comparison

| Criteria | 2Factor | Fast2SMS |
|---|---|---|
| Starting price | ₹0.15/SMS | ₹0.25/SMS |
| Higher-volume price | ₹0.12/SMS | ₹0.11/SMS |
| Free offer | Start Free option; credits unconfirmed | ₹50 signup credit |
| OTP support | Yes | Yes |
| API access | Yes | Yes |
| DLT assistance | Advertised | Requirements to be confirmed |
| Monthly fee | Pay-as-you-go option | No monthly fee |

**Current preference:** 2Factor, because it offers a lower starting price and a dedicated OTP-focused Growth plan. Fast2SMS may become cheaper at higher recharge volumes

## Email Verification – Resend

- **Website:** https://resend.com/
- **Service:** Transactional Email API
- **Purpose:** Send OTPs to users' email addresses to verify email access.
- **API integration:** REST API and official Node.js SDK.
- **Documentation:** https://resend.com/docs

### Features
- Send transactional emails using an API.
- Supports HTML email templates.
- Provides Node.js SDK.
- Supports email verification links and OTP emails.

### Pricing – Free Plan
- 3,000 emails per month.
- Maximum 100 emails per day.
- 3 domains.
- 3 inboxes.
- Monthly cost: $0.

### Integration Requirements
- Create a Resend account.
- Generate an API key.
- Install the Node.js SDK (`npm install resend`).
- Store the API key securely in backend environment variables.
- Verify a sending domain and configure DNS records for production.

### Integration Difficulty
- Easy.
- Provides an official Node.js SDK and straightforward API integration.
- Suitable for integration with a Node.js/Express backend.

### Selected for Implementation
Resend is the preferred email provider for HypeKyte because it offers a useful free tier, simple API integration and an official Node.js SDK.

The backend will generate OTPs, store them temporarily, enforce expiry and verify the codes entered by users. Resend will only handle email delivery.

**Note:** The `onboarding@resend.dev` sender is intended for testing. A verified custom domain is required for production sending.



### Google Places API – Test Result

- Successfully tested the Places API (New) Text Search endpoint.
- **Endpoint:** `POST https://places.googleapis.com/v1/places:searchText`
- **Test query:** `Haldiram restaurant Sonipat`
- **Result:** Received 4 matching business listings.
- **Fields returned:** Place ID, business name, formatted address, phone number (when available), business status, business types, latitude and longitude.
- **Sample response:** `docs/samples/places_response.json`
- **Status:** Successful API response received and saved locally.
- **Usage:** The saved response will be used for mock testing of business matching logic without repeatedly calling Google Places.

**Limitation:** Google Places confirms the existence of a business listing, but does not establish whether the applicant owns or is associated with that business.


### GSTIN API – Sandbox Testing Results

Tested the APIserver GST verification endpoint using its public sandbox playground.

**Endpoint:** `POST /v1/gst/verify`

**Successful verification**
- Returned GSTIN, legal name, trade name, registration status, registration date, PAN and principal business address.
- Response time: 402 ms.
- Cost shown: ₹0.22.

**Record not found**
- Error code: `RECORD_NOT_FOUND`.
- No matching record returned.
- Not retryable.
- No charge.

**Source timeout with fallback**
- Primary source was degraded, but fallback successfully returned GST details.
- `source_status`: `degraded`.
- Attempts: 2.
- Response time: 781 ms.
- Cost shown: ₹0.22.

**All sources unavailable**
- Error code: `PROVIDER_UNAVAILABLE`.
- Both verification sources were unavailable.
- Retryable: true.
- No charge.

**Conclusion:**
The sandbox demonstrates successful verification, record-not-found handling, fallback handling and provider-unavailable handling. APIserver provides the required GSTIN information for HypeKyte, including legal name, trade name, address and registration status.

The backend should distinguish between an unsuccessful GSTIN lookup and a temporary provider failure. Provider failures should remain pending and be retried rather than automatically rejecting the business.

**Sample responses:**
- `docs/samples/gstin_response.json`
- `docs/samples/gstin_not_found_response.json`
- `docs/samples/gstin_fallback_response.json`
- `docs/samples/gstin_provider_unavailable_response.json`