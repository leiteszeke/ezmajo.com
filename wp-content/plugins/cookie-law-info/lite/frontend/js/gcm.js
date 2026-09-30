const _ckyGcmData = window._ckyGcm;
let setDefaultSetting = true;
const regionSettings = _ckyGcmData.default_settings || [];
const waitForTime = _ckyGcmData.wait_for_update;

function getCookieValues(cookieName) {
    const values = [];
    const name = cookieName + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) === 0) {
            values.push(cookie.substring(name.length, cookie.length));
        }
    }
    return values;
}

function getConsentStateForCategory(categoryConsent) {
    return categoryConsent === "yes" ? "granted" : "denied";
}

const dataLayerName =
  window.ckySettings && window.ckySettings.dataLayerName
    ? window.ckySettings.dataLayerName
    : "dataLayer";
 window[dataLayerName] = window[dataLayerName] || [];
 function gtag() {
  window[dataLayerName].push(arguments);
}

function setConsentInitStates(consentData) {
    if (waitForTime > 0) consentData.wait_for_update = waitForTime;
    gtag("consent", "default", consentData );
}

gtag("set", "ads_data_redaction", !!_ckyGcmData.ads_data_redaction);
gtag("set", "url_passthrough", !!_ckyGcmData.url_passthrough);
gtag("set", "developer_id.dY2Q2ZW", true);

for (let index = 0; index < regionSettings.length; index++) {
    const regionSetting = regionSettings[index];
    const consentRegionData = {
        ad_storage: regionSetting.advertisement,
        analytics_storage: regionSetting.analytics,
        functionality_storage: regionSetting.functional,
        personalization_storage: regionSetting.functional,
        security_storage: regionSetting.necessary,
        ad_user_data: regionSetting.ad_user_data,
        ad_personalization: regionSetting.ad_personalization
    };
    const regionsToSetFor = regionSetting.regions
        .split(",")
        .map((region) => region.trim())
        .filter((region) => region);
    if (regionsToSetFor.length > 0 && regionsToSetFor[0].toLowerCase() !== "all")
        consentRegionData.region = regionsToSetFor;
    else setDefaultSetting = false;
    setConsentInitStates(consentRegionData);
}

if (setDefaultSetting) {
    setConsentInitStates({
      ad_storage: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
}

const consentString = getCookieValues("cookieyes-consent")[0];
if (consentString && typeof consentString === "string") {
    const cookieObj = consentString.split(",").reduce(function (acc, curr) {
        const cookieValue = curr.trim().split(":");
        acc[cookieValue[0]] = getConsentStateForCategory(cookieValue[1]);
        return acc;
    }, {});
    
    function updateConsentState(consentState) {
        gtag("consent", "update", consentState);
    }

  updateConsentState({
    ad_storage: cookieObj.advertisement,
    analytics_storage: cookieObj.analytics,
    functionality_storage: cookieObj.functional,
    personalization_storage: cookieObj.functional,
    security_storage: cookieObj.necessary,
    ad_user_data: cookieObj.advertisement,
    ad_personalization: cookieObj.advertisement,
  });
}