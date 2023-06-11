import FormData from "form-data";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import type { ReadStream } from "fs";
import jwt from "jsonwebtoken";

type VersionRange = { min?: string; max?: string };
type Compatibility = Record<string, VersionRange> | Array<string>;
type License =
  | "all-rights-reserved"
  | "MPL-2.0"
  | "GPL-2.0-or-later"
  | "GPL-3.0-or-later"
  | "LGPL-2.1-or-later"
  | "LGPL-3.0-or-later"
  | "MIT"
  | "BSD-2-Clause";
type Channel = "listed" | "unlisted";
type Translated = Record<string, string> & { _default?: string };

type VersionCreateRequest = {
  approval_notes?: string;
  compatibility?: Compatibility;
  license?: License;
  custom_license?: {
    name: Translated;
    text: Translated;
  },
  release_notes?: Translated;
  source?: string;
  upload?: string;
};

type VersionCreateResponse = {
  id: number,
  approval_notes: string;
  channel: Channel;
  compatibility: Compatibility;
  edit_url: string;
  file: {
    id: number;
    created: string;
    hash: string;
    is_mozilla_signed_extension: boolean;
    optional_permissions: string[];
    host_permissions: string[];
    permissions: string[];
    size: number;
    status: number;
    url: string;
  },
  is_disabled: boolean;
  license: {
    is_custom: boolean,
    name: Translated,
    text: Translated,
    url: string | null,
    slug: string | null,
  }
  release_notes: Translated;
  reviewed: string
  is_strict_compatibility_enabled: boolean;
  source: string | null;
  version: string;
}

type AMOApiUploadDetailResponse = {
  uuid: string;
  channel: string;
  processed: boolean;
  submitted: string;
  url: string;
  valid: boolean;
  validation: unknown;
  version: string;
};

const ORIGIN = "https://addons.mozilla.org";

export class AMOClient {
  constructor(
    private readonly auth: { issuer: string, secret: string },
  ) {
  }

  async uploadAddon(
    xpi: ReadStream,
    channel: Channel,
  ): Promise<AMOApiUploadDetailResponse> {
    const token = this._getJwtToken();
    const url = `${ORIGIN}/api/v5/addons/upload/`;
    const form = new FormData();
    form.append("upload", xpi);
    form.append("channel", channel);

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "JWT " + token,
      },
      body: form,
    });
    return (await r.json()) as AMOApiUploadDetailResponse;
  }

  async uploadSource(
    addon: number | string,
    source: ReadStream,
    upload: string,
    license?: License
  ): Promise<unknown> {
    const token = this._getJwtToken();
    const url = `${ORIGIN}/api/v5/addons/addon/${addon}/versions/`
    const form = new FormData();
    form.append("source", source);
    form.append("upload", upload);
    form.append("license", license);

    const r= await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "JWT " + token,
      },
      body: form,
    });
    return (await r.json()) as unknown;
  }

  async versionCreate(addon: number | string, opts: VersionCreateRequest) {
    const token = this._getJwtToken();
    const url = `${ORIGIN}/api/v5/addons/addon/${addon}/versions/`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "JWT " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts),
    });
    return (await r.json()) as VersionCreateResponse;
  }

  async listVersion(addon: number | string): Promise<unknown> {
    const token = this._getJwtToken();
    const url = `${ORIGIN}/api/v5/addons/addon/${addon}/versions/`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "JWT " + token,
        "Content-Type": "application/json",
      },
    });
    return (await r.json()) as unknown;
  }

  async getVersion(addon: number | string, version: number| string) {
    const token = this._getJwtToken();
    const url = `${ORIGIN}/api/v5/addons/addon/${addon}/versions/${version}/`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "JWT " + token,
        "Content-Type": "application/json",
      },
    });
    return (await r.json()) as VersionCreateResponse;
  }

  private _getJwtToken() {
    // See https://addons-server.readthedocs.io/en/latest/topics/api/auth.html
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.auth.issuer,
      jti: uuidv4(),
      iat: issuedAt,
      exp: issuedAt + 60,
    };
    return jwt.sign(payload, this.auth.secret, { algorithm: "HS256" });
  }
}
