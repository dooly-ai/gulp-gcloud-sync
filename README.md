# gulp-gcloud-sync

Sync files to a Google Cloud Storage bucket with Gulp.

`publish` will upload files to a given bucket.

`sync` will delete any files no longer in your local directory after X amount of days to a given bucket.

## Install

```
yarn install gulp-gcloud-sync
```

## Example

```js
import gulp from 'gulp'
import parallelize from 'concurrent-transform';
import * as GGS from 'gulp-gcloud-sync

gulp.task('publish', () => {
  const opts = {
    bucket: 'bucketName,
    keyFilename: '../path/to/creds',
    projectId: 'projectId',
    verbose: false,
    simulate: false,
  }

  return gulp
    .src(['./static/**/*', '!./static/**/*.map'])
    .pipe(
      parallelize(
        GCP.publish({
          public: true,
          metadata: {
            cacheControl: 'no-cache, must-revalidate, public',
          },
          ...opts
        }),
        10,
      )
    )
    .pipe(GGS.sync({ days: 7, ...opts }))
});
```
