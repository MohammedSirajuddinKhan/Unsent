function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearch(value) {
  return normalizeWhitespace(value).split(" ").filter(Boolean);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  normalizeWhitespace,
  tokenizeSearch,
  escapeRegex,
};
