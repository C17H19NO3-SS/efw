import Handlebars from 'handlebars';
import type { FrameworkRequest, FrameworkResponse } from '../types';

export interface HandlebarsOptions {
  viewsDir?: string;
  defaultLayout?: string;
  layoutsDir?: string;
  partialsDir?: string;
  helpers?: Record<string, Handlebars.HelperDelegate>;
  compileOptions?: CompileOptions;
}

export interface CompileOptions {
  data?: boolean;
  compat?: boolean;
  knownHelpers?: Record<string, boolean>;
  knownHelpersOnly?: boolean;
  noEscape?: boolean;
  strict?: boolean;
  assumeObjects?: boolean;
  preventIndent?: boolean;
  ignoreStandalone?: boolean;
  explicitPartialContext?: boolean;
}

export class HandlebarsEngine {
  private viewsDir: string;
  private layoutsDir?: string;
  private partialsDir?: string;
  private defaultLayout?: string;
  private compiledTemplates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private compileOptions: CompileOptions;

  constructor(options: HandlebarsOptions = {}) {
    this.viewsDir = options.viewsDir || './views';
    this.layoutsDir = options.layoutsDir;
    this.partialsDir = options.partialsDir;
    this.defaultLayout = options.defaultLayout;
    this.compileOptions = options.compileOptions || {};

    this.registerDefaultHelpers();
    
    if (options.helpers) {
      this.registerHelpers(options.helpers);
    }

    this.loadPartials();
  }

  private registerDefaultHelpers(): void {
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    Handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    Handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    Handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
    Handlebars.registerHelper('and', (a: any, b: any) => a && b);
    Handlebars.registerHelper('or', (a: any, b: any) => a || b);
    Handlebars.registerHelper('not', (a: any) => !a);
    
    Handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context);
    });
    
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });
    
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });
    
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
    
    Handlebars.registerHelper('formatDate', (date: Date | string, format: string = 'YYYY-MM-DD') => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day);
    });
  }

  public registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    Handlebars.registerHelper(name, helper);
  }

  public registerHelpers(helpers: Record<string, Handlebars.HelperDelegate>): void {
    Object.entries(helpers).forEach(([name, helper]) => {
      this.registerHelper(name, helper);
    });
  }

  private async loadPartials(): Promise<void> {
    if (!this.partialsDir) return;

    try {
      const files = await Bun.$`find ${this.partialsDir} -name "*.hbs"`.text();
      const partialFiles = files.trim().split('\n').filter(f => f);

      for (const filePath of partialFiles) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const content = await file.text();
          const partialName = filePath
            .replace(this.partialsDir + '/', '')
            .replace('.hbs', '');
          
          Handlebars.registerPartial(partialName, content);
        }
      }
    } catch (error) {
      console.warn('Could not load partials:', error);
    }
  }

  private async getTemplate(templatePath: string): Promise<Handlebars.TemplateDelegate> {
    if (this.compiledTemplates.has(templatePath)) {
      return this.compiledTemplates.get(templatePath)!;
    }

    const file = Bun.file(templatePath);
    if (!await file.exists()) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateSource = await file.text();
    const compiled = Handlebars.compile(templateSource, this.compileOptions);
    this.compiledTemplates.set(templatePath, compiled);
    
    return compiled;
  }

  public async render(template: string, data: any = {}): Promise<string> {
    const templatePath = `${this.viewsDir}/${template}.hbs`;
    const compiledTemplate = await this.getTemplate(templatePath);
    
    let rendered = compiledTemplate(data);
    
    if (this.defaultLayout && this.layoutsDir) {
      const layoutPath = `${this.layoutsDir}/${this.defaultLayout}.hbs`;
      const layoutTemplate = await this.getTemplate(layoutPath);
      
      rendered = layoutTemplate({
        ...data,
        body: rendered
      });
    }
    
    return rendered;
  }

  public clearCache(): void {
    this.compiledTemplates.clear();
  }
}

export function createHandlebarsRenderer(options: HandlebarsOptions = {}): (template: string, data?: any) => Promise<string> {
  const engine = new HandlebarsEngine(options);
  return (template: string, data?: any) => engine.render(template, data);
}