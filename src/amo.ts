import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

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
export const LICENSE_NAMES = [
  "all-rights-reserved",
  "MPL-2.0",
  "GPL-2.0-or-later",
  "GPL-3.0-or-later",
  "LGPL-2.1-or-later",
  "LGPL-3.0-or-later",
  "MIT",
  "BSD-2-Clause",
];
export const isLicense = (license: string): license is License => {
  return LICENSE_NAMES.includes(license);
};

type Channel = "listed" | "unlisted";
type Translated = Record<string, string> & { _default?: string };

type CreateVersionRequest = {
  approval_notes?: string;
  compatibility?: Compatibility;
  license?: License;
  custom_license?: {
    name: Translated;
    text: Translated;
  };
  release_notes?: Translated;
  source?: string;
  upload?: string;
};

type UpdateVersionRequest = {
  approval_notes?: string;
  compatibility?: Compatibility;
  is_disabled?: boolean;
  license?: License;
  custom_license?: {
    name: Translated;
    text: Translated;
  };
  release_notes?: Translated;
  source?: string;
};

type VersionDetailResponse = {
  id: number;
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
  };
  is_disabled: boolean;
  license: {
    is_custom: boolean;
    name: Translated;
    text: Translated;
    url: string | null;
    slug: string | null;
  };
  release_notes: Translated;
  reviewed: string;
  is_strict_compatibility_enabled: boolean;
  source: string | null;
  version: string;
};

type AMOApiUploadDetailResponse = {
  uuid: string;
  channel: string;
  processed: boolean;
  submitted: string;
  url: string;
  valid: boolean;
  validation: unknown; // validation is undocumented
  version: string;
};

const PRODUCTION_ORIGIN = "https://addons.mozilla.org";

export class AMOClient {
  private auth: { issuer: string; secret: string };
  private origin: string;

  constructor({
    auth,
    origin = PRODUCTION_ORIGIN,
  }: {
    auth: { issuer: string; secret: string };
    origin?: string;
  }) {
    this.auth = auth;
    this.origin = origin;
  }

  async uploadAddon(
    xpi: Blob,
    channel: Channel,
  ): Promise<AMOApiUploadDetailResponse> {
    const path = "/api/v5/addons/upload/";
    const form = new FormData();
    form.append("upload", xpi, "addon.zip");
    form.append("channel", channel);

    return this.proceed<AMOApiUploadDetailResponse>(path, "POST", form);
  }

  async getUpload(uuid: string): Promise<AMOApiUploadDetailResponse> {
    const path = `/api/v5/addons/upload/${uuid}`;

    return this.proceed<AMOApiUploadDetailResponse>(path, "GET");
  }

  async uploadSource(
    addon: number | string,
    version: string,
    source: Blob,
    license?: License,
  ): Promise<VersionDetailResponse> {
    const path = `/api/v5/addons/addon/${addon}/versions/${version}/`;
    const form = new FormData();
    form.append("source", source, "source.zip");
    form.append("license", license);

    return this.proceed<VersionDetailResponse>(path, "PATCH", form);
  }

  async createVersion(addon: number | string, opts: CreateVersionRequest) {
    const path = `/api/v5/addons/addon/${addon}/versions/`;

    return this.proceed<VersionDetailResponse>(path, "POST", opts);
  }

  async editVersion(addon: number | string, opts: UpdateVersionRequest) {
    const path = `/api/v5/addons/addon/${addon}/versions/`;

    return this.proceed<VersionDetailResponse>(path, "PATCH", opts);
  }

  async listVersion(addon: number | string): Promise<unknown> {
    const path = `/api/v5/addons/addon/${addon}/versions/`;

    return this.proceed<VersionDetailResponse[]>(path, "GET");
  }

  async getVersion(addon: number | string, version: number | string) {
    const path = `/api/v5/addons/addon/${addon}/versions/${version}/`;

    return this.proceed<VersionDetailResponse>(path, "GET");
  }

  async getVersionOrUndefined(
    addon: number | string,
    version: number | string,
  ): Promise<VersionDetailResponse | undefined> {
    const path = `/api/v5/addons/addon/${addon}/versions/${version}/`;

    return this.proceedOrUndefined<VersionDetailResponse>(path, "GET");
  }

  private async proceed<T>(
    path: string,
    method: string,
    params?: unknown,
  ): Promise<T> {
    const token = this._getJwtToken();
    const url = `${this.origin}${path}`;
    const headers: Record<string, string> = { Authorization: `JWT ${token}` };
    let body: string | FormData | undefined;

    if (params instanceof FormData) {
      body = params;
    } else if (typeof params === "undefined") {
      body = undefined;
    } else {
      body = JSON.stringify(params);
      headers["Content-Type"] = "application/json";
    }

    const resp = await fetch(url, { method, headers, body });
    if (resp.status >= 400) {
      throw new Error(
        `Failed to ${method} ${url}: ${resp.status} ${
          resp.statusText
        } ${await resp.text()}`,
      );
    }

    return (await resp.json()) as T;
  }

  private async proceedOrUndefined<T>(
    path: string,
    method: string,
    params?: unknown,
  ): Promise<T | undefined> {
    const token = this._getJwtToken();
    const url = `${this.origin}${path}`;
    const headers: Record<string, string> = { Authorization: `JWT ${token}` };
    let body: string | FormData | undefined;

    if (params instanceof FormData) {
      body = params;
    } else if (typeof params === "undefined") {
      body = undefined;
    } else {
      body = JSON.stringify(params);
      headers["Content-Type"] = "application/json";
    }

    const resp = await fetch(url, { method, headers, body });
    if (resp.status === 404) {
      return undefined;
    }
    if (resp.status >= 400) {
      throw new Error(
        `Failed to ${method} ${url}: ${resp.status} ${
          resp.statusText
        } ${await resp.text()}`,
      );
    }

    return (await resp.json()) as T;
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
