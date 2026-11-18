declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ALPHA_VANTAGE_API_KEY?: string;
  }
}
