function bufferToBase64(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64");
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(value)).toString("base64");
  }

  if (typeof value === "object") {
    if (Buffer.isBuffer(value.buffer)) {
      return value.buffer.toString("base64");
    }

    if (value.buffer instanceof Uint8Array) {
      return Buffer.from(value.buffer).toString("base64");
    }

    if (value.buffer instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array(value.buffer)).toString("base64");
    }
  }

  if (Array.isArray(value)) {
    return Buffer.from(value).toString("base64");
  }

  if (value && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString("base64");
  }

  if (value && value.type === "Buffer" && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString("base64");
  }

  return "";
}

function buildImageSource(image) {
  if (!image || !image.data || !image.contentType) {
    return null;
  }

  const base64 = bufferToBase64(image.data);

  if (!base64) {
    return null;
  }

  return `data:${image.contentType};base64,${base64}`;
}

function buildImageRecord(file, altText) {
  if (!file) {
    return null;
  }

  return {
    data: file.buffer,
    contentType: file.mimetype,
    filename: file.originalname,
    alt: altText || file.originalname || "Attached image",
  };
}

module.exports = {
  buildImageRecord,
  buildImageSource,
  bufferToBase64,
};
