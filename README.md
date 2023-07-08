<p>
  <a href="https://github.com/browser-actions/release-firefox-addon/actions/workflows/release.yml"><img alt="typescript-action status" src="https://github.com/browser-actions/release-firefox-addon/actions/workflows/release.yml/badge.svg"></a>
</p>

# release-firefox-addon

This action publishes a Firefox add-on to the AMO (addons.mozilla.org).

## Usage

The minimal usage is as follows:

```yaml
steps:
- uses: browser-actions/release-firefox-addon@latest
  with:
    addon-id: "please specify your add-on in number or UUID format, or add-on name"
    addon-path: "path/to/your/addon.zip"
    auth-api-issuer: ${{ secrets.AUTH_API_ISSUER }}
    auth-api-secret: ${{ secrets.AUTH_API_SECRET }}
```

The `auth-api-issuer` and `auth-api-secret` are used to authenticate with the AMO API with JWT token. You can get credentials from [here](https://addons.mozilla.org/en-US/developers/addon/api/key/).

If your add-on includes minified files or transpiled files, you should submit your add-on with source code.

```yaml
steps:
- uses: browser-actions/public-firefox-addon@latest
  with:
    addon-id: "please specify your add-on in number or UUID format, or add-on name"
    addon-path: "path/to/your/addon.zip"
    source-path: "path/to/your/source-code.zip"
    approval-note: |
      The source project requires Node.js 20.x and yarn v3.
      To generate the source code, please run ...
    auth-api-issuer: ${{ secrets.AUTH_API_ISSUER }}
    auth-api-secret: ${{ secrets.AUTH_API_SECRET }}
```

### Inputs

All supported options are the following:

| Name                        | Description                                                                                                                              | Required | Default  |
| ---                         | ---                                                                                                                                      | ---      | ---      |
| `addon-id`                  | ID of the add-on to be published in numeric or UUID format, or the add-on slug                                                           | Yes      |          |
| `addon-path`                | Path to the add-on file to be published                                                                                                  | Yes      |          |
| `source-path`               | Optional path to the source file of the version.  This is nessesary if the version contains minified, concatenated, or transpiled code.  |          |          |
| `approval-note`             | Optional note to help reviewers such as how to build the add-on or how to test with test accounts.                                       |          |          |
| `compatibility-firefox-min` | Minimum version of Firefox that the version is compatible with.                                                                          |          |          |
| `compatibility-firefox-max` | Maximum version of Firefox that the version of the add-on is compatible with.                                                            |          |          |
| `license`                   | License of the version.  You can see available licenses [here](https://addons-server.readthedocs.io/en/latest/topics/api/licenses.html). |          |          |
| `release-note`              | Information about changes in the new version.  Note that this field supports only locale "en-US".                                        |          |          |
| `channel`                   | 'Channel to publish the version.  This field supports only "listed" and "unlisted".                                                      |          | `listed` |
| `auth-api-issuer`           | An API key of the JWT token for authentication.                                                                                          | Yes      |          |
| `auth-api-secret`           | An API secret of the JWT token for authentication.                                                                                       | Yes      |          |

### Outputs

All supported outputs are the following:

| Name               | Description                                    |
| ---                | ---                                            |
| `version`          | 'Version number of the uploaded version.       |
| `version-id`       | 'ID of the uploaded version in numeric format. |
| `version-edit-url` | 'URL of the edit page of the uploaded version. |

## License

[MIT](LICENSE)
