/*
 * Code guide: tests/http/business-onboarding.mjs
 * HTTP verification for business onboarding. Connects to API_BASE_URL or localhost and checks real
 * endpoint/page responses. Fixture helpers may create synthetic accounts/businesses; use a disposable
 * development instance.
 */
// Developer-led onboarding now includes owner activation.
/*
 * Import connection: ./owner-provisioning.mjs -> tests/http/owner-provisioning.mjs.
 * Loads this stylesheet for the component/page; it supplies styles only.
 */
import "./owner-provisioning.mjs";
