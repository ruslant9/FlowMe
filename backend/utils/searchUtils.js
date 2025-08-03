// backend/utils/searchUtils.js --- НОВЫЙ ФАЙЛ ---

const ruToEn = { 'й':'q', 'ц':'w', 'у':'e', 'к':'r', 'е':'t', 'н':'y', 'г':'u', 'ш':'i', 'щ':'o', 'з':'p', 'х':'[', 'ъ':']', 'ф':'a', 'ы':'s', 'в':'d', 'а':'f', 'п':'g', 'р':'h', 'о':'j', 'л':'k', 'д':'l', 'ж':';', 'э':'\'', 'я':'z', 'ч':'x', 'с':'c', 'м':'v', 'и':'b', 'т':'n', 'ь':'m', 'б':',', 'ю':'.', 'ё':'`' };
const enToRu = { 'q':'й', 'w':'ц', 'e':'у', 'r':'к', 't':'е', 'y':'н', 'u':'г', 'i':'ш', 'o':'щ', 'p':'з', '[':'х', ']':'ъ', 'a':'ф', 's':'ы', 'd':'в', 'f':'а', 'g':'п', 'h':'р', 'j':'о', 'k':'л', 'l':'д', ';':'ж', '\'':'э', 'z':'я', 'x':'ч', 'c':'с', 'v':'м', 'b':'и', 'n':'т', 'm':'ь', ',':'б', '.':'ю', '`':'ё' };

function convertLayout(text) {
    const firstChar = text.charAt(0).toLowerCase();
    const map = ruToEn[firstChar] ? ruToEn : (enToRu[firstChar] ? enToRu : null);
    if (!map) return text;

    return text.split('').map(char => {
        const lowerChar = char.toLowerCase();
        const mapped = map[lowerChar];
        if (mapped) {
            // Keep original case
            return char === lowerChar ? mapped : mapped.toUpperCase();
        }
        return char;
    }).join('');
}

function createFuzzyRegex(term) {
    // Escape special regex characters from user input first
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Then replace characters for fuzzy matching
    const fuzzyTerm = escapedTerm
        .replace(/[еэё]/gi, '[еэё]')
        .replace(/[ий]/gi, '[ий]');
    
    return new RegExp(fuzzyTerm, 'i');
}

function generateSearchQueries(query) {
    const originalQuery = query.trim();
    if (!originalQuery) return [];

    const searchStrings = new Set();
    searchStrings.add(originalQuery);
    
    const convertedQuery = convertLayout(originalQuery);
    if (convertedQuery.toLowerCase() !== originalQuery.toLowerCase()) {
        searchStrings.add(convertedQuery);
    }

    // Create a regex pattern for each unique search string
    const regexPatterns = Array.from(searchStrings).map(term => createFuzzyRegex(term));
    
    return regexPatterns;
}

module.exports = { generateSearchQueries };