const UNICODE_CARD_IMAGE_FILES = [
    "002-U+1F0A2.svg",
    "003-U+1F0A3.svg",
    "004-U+1F0A4.svg",
    "005-U+1F0A5.svg",
    "006-U+1F0A6.svg",
    "007-U+1F0A7.svg",
    "008-U+1F0A8.svg",
    "009-U+1F0A9.svg",
    "010-U+1F0AA.svg",
    "011-U+1F0AB.svg",
    "013-U+1F0AD.svg",
    "014-U+1F0AE.svg",
    "001-U+1F0A1.svg",
    "016-U+1F0B2.svg",
    "017-U+1F0B3.svg",
    "018-U+1F0B4.svg",
    "019-U+1F0B5.svg",
    "020-U+1F0B6.svg",
    "021-U+1F0B7.svg",
    "022-U+1F0B8.svg",
    "023-U+1F0B9.svg",
    "024-U+1F0BA.svg",
    "025-U+1F0BB.svg",
    "027-U+1F0BD.svg",
    "028-U+1F0BE.svg",
    "015-U+1F0B1.svg",
    "031-U+1F0C2.svg",
    "032-U+1F0C3.svg",
    "033-U+1F0C4.svg",
    "034-U+1F0C5.svg",
    "035-U+1F0C6.svg",
    "036-U+1F0C7.svg",
    "037-U+1F0C8.svg",
    "038-U+1F0C9.svg",
    "039-U+1F0CA.svg",
    "040-U+1F0CB.svg",
    "042-U+1F0CD.svg",
    "043-U+1F0CE.svg",
    "030-U+1F0C1.svg",
    "046-U+1F0D2.svg",
    "047-U+1F0D3.svg",
    "048-U+1F0D4.svg",
    "049-U+1F0D5.svg",
    "050-U+1F0D6.svg",
    "051-U+1F0D7.svg",
    "052-U+1F0D8.svg",
    "053-U+1F0D9.svg",
    "054-U+1F0DA.svg",
    "055-U+1F0DB.svg",
    "057-U+1F0DD.svg",
    "058-U+1F0DE.svg",
    "045-U+1F0D1.svg",
    "059-U+1F0DF.svg",
    "060-U+1F0A0.svg",
];
export const PLAYING_CARD_CHARACTERS = UNICODE_CARD_IMAGE_FILES.map((file) => {
    const [codePoint] = file.match(/U\+([0-9A-F]+)/)?.slice(1) ?? [];
    if (!codePoint) {
        return "?";
    }
    return String.fromCodePoint(Number.parseInt(codePoint, 16));
});
export const CARD_BACK_ID = PLAYING_CARD_CHARACTERS.length - 1;
const UNICODE_CARD_IMAGE_MODULES = import.meta.glob("../../assets/unicode-card-images/*.svg", { eager: true, import: "default" });
const UNICODE_CARD_IMAGE_URL_BY_FILE = new Map();
for (const [modulePath, moduleUrl] of Object.entries(UNICODE_CARD_IMAGE_MODULES)) {
    const filename = modulePath.split("/").at(-1);
    if (!filename)
        continue;
    UNICODE_CARD_IMAGE_URL_BY_FILE.set(filename, moduleUrl);
}
const UNICODE_CARD_IMAGE_URLS = UNICODE_CARD_IMAGE_FILES.map((filename) => UNICODE_CARD_IMAGE_URL_BY_FILE.get(filename) ?? null);
const UNICODE_CARD_IMAGE_CACHE = new Map();
const UNICODE_CARD_IMAGE_LOADING = new Map();
let preloadUnicodeCardImagesPromise = null;
export function getCachedUnicodeCardImage(id) {
    return UNICODE_CARD_IMAGE_CACHE.get(id);
}
export function isUnicodeCardImageLoading(id) {
    return UNICODE_CARD_IMAGE_LOADING.has(id);
}
export function loadUnicodeCardImage(id) {
    const cachedImage = UNICODE_CARD_IMAGE_CACHE.get(id);
    if (cachedImage !== undefined) {
        return Promise.resolve(cachedImage);
    }
    const loadingImage = UNICODE_CARD_IMAGE_LOADING.get(id);
    if (loadingImage) {
        return loadingImage;
    }
    const imageUrl = UNICODE_CARD_IMAGE_URLS[id];
    if (!imageUrl) {
        UNICODE_CARD_IMAGE_CACHE.set(id, null);
        return Promise.resolve(null);
    }
    const loadPromise = new Promise((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
            UNICODE_CARD_IMAGE_CACHE.set(id, image);
            UNICODE_CARD_IMAGE_LOADING.delete(id);
            resolve(image);
        };
        image.onerror = () => {
            UNICODE_CARD_IMAGE_CACHE.set(id, null);
            UNICODE_CARD_IMAGE_LOADING.delete(id);
            resolve(null);
        };
        image.src = imageUrl;
    });
    UNICODE_CARD_IMAGE_LOADING.set(id, loadPromise);
    return loadPromise;
}
export function preloadUnicodeCardImages() {
    if (preloadUnicodeCardImagesPromise) {
        return preloadUnicodeCardImagesPromise;
    }
    preloadUnicodeCardImagesPromise = Promise.all(UNICODE_CARD_IMAGE_URLS.map((_, id) => loadUnicodeCardImage(id))).then(() => undefined);
    return preloadUnicodeCardImagesPromise;
}
//# sourceMappingURL=unicodeCards.js.map