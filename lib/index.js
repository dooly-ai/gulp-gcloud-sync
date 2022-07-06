const { Storage } = require("@google-cloud/storage")
const { Transform } = require("readable-stream")
const color = require("ansi-colors")
const log = require("fancy-log")

const {
  PLUGIN_NAME,
  WEEK,
  blank,
  md5Hash,
  normalizedPath,
  prepareMetadata,
  validate,
} = require('./utils')

/**
 * Upload a file to a Google Cloud Storage bucket
 *
 * @param {Object}  options
 * @param {String}  options.bucket      - Name of the bucket you want to upload the files into
 * @param {String}  options.keyFilename - Path to the KeyFile JSON
 * @param {String}  options.projectId   - Your Google Cloud Project ID
 * @param {Boolean} [options.verbose]   - Display debug logging
 * @param {Boolean} [options.simulate]  - Dry Run. Do not upload to GCP
 * @param {Boolean} [options.public]    - Set the file as public
 * @param {Object}  [options.metadata]  - Set the file metadata
 * @param {Boolean} [options.force]     - Force upload files ignoring md5 check
 */

const publish = options => {
  validate(options)

  const stream = new Transform({ objectMode: true })

  stream._transform = function (file, _enc, cb) {
    if (file.isNull()) {
      return cb()
    }

    // Streams not supported

    if (file.isStream()) {
      this.emit(
        "error",
        new PluginError(PLUGIN_NAME, "Stream content is not supported")
      )
      return cb()
    }

    const storage = new Storage({
      keyFilename: options.keyFilename,
      projectId: options.projectId
    })

    const bucket = storage.bucket(options.bucket)
    const path = normalizedPath(file)

    bucket.file(path).getMetadata((_, meta) => {
      const md5 = meta?.md5Hash
      const current = md5Hash(file.contents)
      const unchanged = md5 === current

      if (options.verbose) {
        const value = `${path} Existing: ${md5} Current: ${current} Unchanged: ${unchanged}`
        log("[md5 check]", color.yellow(value))
      }

      if (unchanged && !options.force) {
        log("[skip]", color.cyan(path))
        return cb(null, file)
      } else {
        const uploadOptions = {
          destination: path,
          metadata: prepareMetadata(file, options.metadata),
          public: !!options.public,
        }

        if (!options.simulate) bucket.upload(file.path, uploadOptions)

        log("[upload]", color.green(path))
        return cb(null, file)
      }
    })
  }

  return stream
}

/**
 * Sync deletes to a Google Cloud Storage bucket
 *
 * @param {Object}  options
 * @param {String}  options.bucket      - Name of the bucket we want to delete the files from
 * @param {String}  options.keyFilename - Path to the KeyFile JSON
 * @param {String}  options.projectId   - Your Google Cloud Project ID
 * @param {Boolean} [options.verbose]   - Display debug logging
 * @param {Boolean} [options.simulate]  - Dry Run. Do not delete files on GCP
 * @param {Number}  [options.days]      - Length of time to wait before deleting old files in days
*/

const sync = (options) => {
  validate(options)

  const storage = new Storage({
    keyFilename: options.keyFilename,
    projectId: options.projectId
  })

  const bucket = storage.bucket(options.bucket)

  const stream = new Transform({ objectMode: true })

  const newFiles = {}

  stream._transform = (file, _enc, cb) => {
    const path = normalizedPath(file)
    newFiles[path] = true
    cb()
  }

  stream._flush = cb => {
    bucket.getFiles((_, files) => {
      const mappedFiles = files.map(file => [file.name, file.metadata.timeCreated])
      const now = new Date().getTime()
      const time = blank(options.days) ? WEEK : options.days * DAY

      mappedFiles.forEach(([fileName, created]) => {
        const exists = newFiles[fileName]
        const createdAt = Date.parse(created)
        const diff = now - (createdAt + time)
        const isOld = diff > 0

        if (options.verbose) {
          const value = `${fileName} Exists: ${exists} Created: ${createdAt} Old: ${isOld}`
          log("[del check]", color.blue(value))
        }

        if (!exists && isOld) {
          log("[delete]", color.red(fileName))
          if (!options.simulate) bucket.file(fileName).delete()
        }
      })

      cb()
    })
  }

  return stream
}

module.exports = {
  publish,
  sync,
}
