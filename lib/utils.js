const PluginError = require("plugin-error")
const { createHash } = require("crypto")
const mime = require("mime")

const REQUIRED_OPTIONS = [
  'bucket',
  'keyFilename',
  'projectId',
]

const PLUGIN_NAME = "gulp-gcloud-publish"

const WEEK = 604800000
const DAY = 86400000

const blank = value => {
  return (
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    value === ""
  )
}

const getContentType = (filepath) => {
  if (filepath.match(/.js.br$/)) {
    return "application/javascript"
  }

  if (filepath.match(/.css.br$/)) {
    return "text/css"
  }

  if (filepath.match(/.svg.br$/)) {
    return "image/svg+xml"
  }

  if (filepath.match(/.html.br$/)) {
    return "text/html"
  }

  return mime.getType(filepath)
}

const setBrotliEncoding = (file) => {
  if (file.path.match(/.(js|css|svg).br$/)) {
    return "br"
  }

  return null
}

const generateError = key => {
  return new PluginError(
    PLUGIN_NAME,
    `Missing required configuration: ${key}`
  )
}

const md5Hash = (buf) => {
  return createHash("md5").update(buf).digest("base64")
}

const normalizedPath = (file, stripLeadingSlash = true) => {
  const path = file.path.replace(file.base, "").toLowerCase()

  if (stripLeadingSlash) {
    return path.replace(/^\//, '')
  } else {
    return path
  }
}

const prepareMetadata = (file, metadata) => {
  const meta = {
    contentType: getContentType(file.path)
  }

  const encoding = setBrotliEncoding(file)

  if (encoding) {
    meta.contentEncoding = encoding
  }

  return { ...meta, ...metadata }
}

const validate = options => {
  REQUIRED_OPTIONS.forEach(key => {
    if (!options?.[key]) throw generateError(key)
  })
}

module.exports = {
  PLUGIN_NAME,
  WEEK,
  DAY,
  md5Hash,
  normalizedPath,
  prepareMetadata,
  blank,
  validate,
}
