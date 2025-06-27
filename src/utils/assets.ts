import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

export interface AssetOptions {
  publicPath?: string;
  assetsPath?: string;
  hashLength?: number;
  enableVersioning?: boolean;
  cacheMaxAge?: number;
}

export interface AssetInfo {
  originalPath: string;
  versionedPath: string;
  hash: string;
  size: number;
  mtime: Date;
  contentType: string;
}

export class AssetVersioning {
  private static instance: AssetVersioning;
  private cache = new Map<string, AssetInfo>();
  private options: Required<AssetOptions>;

  private constructor(options: AssetOptions = {}) {
    this.options = {
      publicPath: options.publicPath || '/public',
      assetsPath: options.assetsPath || './public',
      hashLength: options.hashLength || 8,
      enableVersioning: options.enableVersioning ?? true,
      cacheMaxAge: options.cacheMaxAge || 86400 // 24 hours
    };
  }

  static getInstance(options?: AssetOptions): AssetVersioning {
    if (!AssetVersioning.instance) {
      AssetVersioning.instance = new AssetVersioning(options);
    }
    return AssetVersioning.instance;
  }

  private getContentType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  private generateHash(content: Buffer): string {
    return createHash('md5')
      .update(content)
      .digest('hex')
      .substring(0, this.options.hashLength);
  }

  private buildVersionedPath(originalPath: string, hash: string): string {
    const ext = extname(originalPath);
    const baseName = originalPath.replace(ext, '');
    return `${baseName}.${hash}${ext}`;
  }

  getAssetInfo(assetPath: string): AssetInfo | null {
    const fullPath = join(this.options.assetsPath, assetPath);
    
    if (!existsSync(fullPath)) {
      return null;
    }

    // Check cache first
    const cached = this.cache.get(assetPath);
    const stats = statSync(fullPath);
    
    if (cached && cached.mtime >= stats.mtime) {
      return cached;
    }

    // Generate new asset info
    const content = readFileSync(fullPath);
    const hash = this.generateHash(content);
    const versionedPath = this.options.enableVersioning 
      ? this.buildVersionedPath(assetPath, hash)
      : assetPath;

    const assetInfo: AssetInfo = {
      originalPath: assetPath,
      versionedPath,
      hash,
      size: stats.size,
      mtime: stats.mtime,
      contentType: this.getContentType(assetPath)
    };

    this.cache.set(assetPath, assetInfo);
    return assetInfo;
  }

  getVersionedUrl(assetPath: string): string {
    const assetInfo = this.getAssetInfo(assetPath);
    if (!assetInfo) {
      return `${this.options.publicPath}/${assetPath}`;
    }

    return `${this.options.publicPath}/${assetInfo.versionedPath}`;
  }

  generateManifest(): Record<string, string> {
    const manifest: Record<string, string> = {};
    
    for (const [originalPath, assetInfo] of this.cache) {
      manifest[originalPath] = assetInfo.versionedPath;
    }
    
    return manifest;
  }

  clearCache(): void {
    this.cache.clear();
  }

  preloadAssets(assetPaths: string[]): void {
    for (const path of assetPaths) {
      this.getAssetInfo(path);
    }
  }

  // Template helpers
  css(path: string): string {
    const url = this.getVersionedUrl(path);
    return `<link rel="stylesheet" href="${url}">`;
  }

  js(path: string, type: 'module' | 'script' = 'script'): string {
    const url = this.getVersionedUrl(path);
    const typeAttr = type === 'module' ? ' type="module"' : '';
    return `<script src="${url}"${typeAttr}></script>`;
  }

  img(path: string, alt: string = '', attributes: Record<string, string> = {}): string {
    const url = this.getVersionedUrl(path);
    const attrs = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    return `<img src="${url}" alt="${alt}" ${attrs}>`;
  }

  link(path: string, rel: string = 'stylesheet', attributes: Record<string, string> = {}): string {
    const url = this.getVersionedUrl(path);
    const attrs = Object.entries({ rel, href: url, ...attributes })
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    return `<link ${attrs}>`;
  }

  // Integrity helpers for security
  generateIntegrity(assetPath: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): string | null {
    const fullPath = join(this.options.assetsPath, assetPath);
    
    if (!existsSync(fullPath)) {
      return null;
    }

    const content = readFileSync(fullPath);
    const hash = createHash(algorithm).update(content).digest('base64');
    return `${algorithm}-${hash}`;
  }

  cssWithIntegrity(path: string): string {
    const url = this.getVersionedUrl(path);
    const integrity = this.generateIntegrity(path);
    const integrityAttr = integrity ? ` integrity="${integrity}" crossorigin="anonymous"` : '';
    return `<link rel="stylesheet" href="${url}"${integrityAttr}>`;
  }

  jsWithIntegrity(path: string, type: 'module' | 'script' = 'script'): string {
    const url = this.getVersionedUrl(path);
    const integrity = this.generateIntegrity(path);
    const typeAttr = type === 'module' ? ' type="module"' : '';
    const integrityAttr = integrity ? ` integrity="${integrity}" crossorigin="anonymous"` : '';
    return `<script src="${url}"${typeAttr}${integrityAttr}></script>`;
  }

  // Preload helpers
  preloadCSS(path: string): string {
    const url = this.getVersionedUrl(path);
    return `<link rel="preload" href="${url}" as="style" onload="this.onload=null;this.rel='stylesheet'">`;
  }

  preloadJS(path: string): string {
    const url = this.getVersionedUrl(path);
    return `<link rel="preload" href="${url}" as="script">`;
  }

  // Bundle multiple assets
  bundle(paths: string[], type: 'css' | 'js'): string {
    const tags = paths.map(path => {
      return type === 'css' ? this.css(path) : this.js(path);
    });
    return tags.join('\n');
  }

  // Development mode helpers
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  getAssetStats(): {
    totalAssets: number;
    totalSize: number;
    averageSize: number;
    assetsByType: Record<string, number>;
  } {
    const assets = Array.from(this.cache.values());
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const assetsByType: Record<string, number> = {};

    for (const asset of assets) {
      const ext = extname(asset.originalPath);
      assetsByType[ext] = (assetsByType[ext] || 0) + 1;
    }

    return {
      totalAssets: assets.length,
      totalSize,
      averageSize: assets.length > 0 ? totalSize / assets.length : 0,
      assetsByType
    };
  }
}