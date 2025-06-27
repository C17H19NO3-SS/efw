import ejs from 'ejs';
import type { FrameworkRequest, FrameworkResponse } from '../types';

export interface EjsOptions {
  viewsDir?: string;
  cache?: boolean;
  delimiter?: string;
  debug?: boolean;
  compileDebug?: boolean;
  client?: boolean;
  escape?: (markup?: any) => string;
  include?: (path: string, data?: object) => string;
  rethrow?: boolean;
  root?: string | string[];
  views?: string | string[];
  'view cache'?: boolean;
  rmWhitespace?: boolean;
  strict?: boolean;
  outputFunctionName?: string;
  localsName?: string;
}

export class EjsEngine {
  private viewsDir: string;
  private options: EjsOptions;
  private compiledTemplates: Map<string, ejs.TemplateFunction> = new Map();

  constructor(options: EjsOptions = {}) {
    this.viewsDir = options.viewsDir || './views';
    this.options = {
      cache: false,
      debug: false,
      compileDebug: true,
      rmWhitespace: false,
      strict: false,
      ...options,
      views: this.viewsDir,
      root: this.viewsDir
    };
  }

  private async getTemplate(templatePath: string): Promise<ejs.TemplateFunction> {
    if (this.options.cache && this.compiledTemplates.has(templatePath)) {
      return this.compiledTemplates.get(templatePath)!;
    }

    const file = Bun.file(templatePath);
    if (!await file.exists()) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateSource = await file.text();
    const compiled = ejs.compile(templateSource, {
      ...this.options,
      filename: templatePath
    });

    if (this.options.cache) {
      this.compiledTemplates.set(templatePath, compiled);
    }
    
    return compiled;
  }

  public async render(template: string, data: any = {}): Promise<string> {
    const templatePath = `${this.viewsDir}/${template}.ejs`;
    const compiledTemplate = await this.getTemplate(templatePath);
    
    return compiledTemplate({
      ...data,
      include: (path: string, includeData?: any) => {
        return this.renderSync(path, { ...data, ...includeData });
      }
    });
  }

  public async renderFile(templatePath: string, data: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      ejs.renderFile(templatePath, data, this.options, (err, str) => {
        if (err) {
          reject(err);
        } else {
          resolve(str);
        }
      });
    });
  }

  private renderSync(template: string, data: any = {}): string {
    try {
      const templatePath = `${this.viewsDir}/${template}.ejs`;
      const templateSource = Bun.file(templatePath);
      return ejs.render(templateSource.toString(), data, {
        ...this.options,
        filename: templatePath
      });
    } catch (error) {
      console.error('EJS render sync error:', error);
      return '';
    }
  }

  public clearCache(): void {
    this.compiledTemplates.clear();
    ejs.clearCache();
  }

  public setOptions(options: Partial<EjsOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

export function createEjsRenderer(options: EjsOptions = {}): (template: string, data?: any) => Promise<string> {
  const engine = new EjsEngine(options);
  return (template: string, data?: any) => engine.render(template, data);
}

export async function renderEjsFile(filePath: string, data: any = {}, options: EjsOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    ejs.renderFile(filePath, data, options, (err, str) => {
      if (err) {
        reject(err);
      } else {
        resolve(str);
      }
    });
  });
}