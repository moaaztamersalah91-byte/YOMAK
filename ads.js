/* YOMAK ad placement and rewarded-ad adapter.
   Safe by default: placeholders only; no fake video, no fake impression, no reward without provider verification.
*/
(function () {
    'use strict';
    const config = window.YOMAK_ADS_CONFIG || { provider: 'none', displayPlaceholders: true, rewardedAdsEnabled: false };
    function renderSlots() {
        document.querySelectorAll('[data-yomak-ad-slot]').forEach((slot) => {
            if (slot.dataset.adReady === '1')
                return;
            slot.dataset.adReady = '1';
            if (config.displayPlaceholders && config.provider === 'none') {
                slot.classList.add('yomak-ad-slot--preview');
                slot.setAttribute('aria-label', 'مساحة إعلانية تجريبية، الإعلانات غير مفعّلة');
                if (!slot.textContent.trim()) {
                    const label = document.createElement('span');
                    label.className = 'yomak-ad-slot__label';
                    label.textContent = 'مساحة إعلانية';
                    const note = document.createElement('small');
                    note.textContent = 'مكان مخصص للإعلان — غير مفعّل حاليًا';
                    slot.append(label, note);
                }
            }
        });
    }
    // Provider adapters must call onReward only after their verified reward callback.
    // Until a supported provider is configured, this deliberately returns unavailable.
    async function showRewardedAd({ placementId } = {}) {
        if (!config.rewardedAdsEnabled || config.provider === 'none') {
            return { status: 'unavailable', placementId: placementId || null };
        }
        const adapter = window.YOMAK_REWARDED_ADAPTER;
        if (!adapter || typeof adapter.show !== 'function') {
            return { status: 'unavailable', placementId: placementId || null };
        }
        try {
            const result = await adapter.show({ placementId });
            if (result && result.status === 'rewarded' && result.verified === true)
                return result;
            return { status: 'not-rewarded', placementId: placementId || null };
        }
        catch (_) {
            return { status: 'error', placementId: placementId || null };
        }
    }
    window.YomakAds = Object.freeze({ renderSlots, showRewardedAd, isRewardedReady: () => !!config.rewardedAdsEnabled && config.provider !== 'none' });
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', renderSlots, { once: true });
    else
        renderSlots();
})();

