/** @format */

/*
 * Check for the existence of the GTM datalayer, which will be active IF
 * cookies have been consented if so fire
 * off a custom tracking event
 */
const preCookieEvents: Record<string, any>[] = [];
export function dispatchGTMEvent(event: Record<string, any>): void {
    //need to hack the account to stop GA autoconvertying to float64!
    if (event.account) {
        event.account = 'W' + event.account;
    }
    if ((window as any).dataLayer) {
        (window as any).dataLayer.push(event);
    } else {
        preCookieEvents.push(event);
    }
}
/*
 *   Drain all events triggered b4 consent
 */

export function handlePreCookieConsentEvents(): void {
    preCookieEvents.map((evt) => {
        if ((window as any).dataLayer) {
            (window as any).dataLayer.push(evt);
        }
    });
}
