export interface ErrorPageOptions {
  showDetails?: boolean;
  theme?: 'light' | 'dark';
  brandName?: string;
  supportEmail?: string;
  homeUrl?: string;
  customCSS?: string;
}

export class ErrorPages {
  private static defaultOptions: ErrorPageOptions = {
    showDetails: false,
    theme: 'light',
    brandName: 'Framework',
    homeUrl: '/',
  };

  private static getBaseStyles(theme: 'light' | 'dark' = 'light'): string {
    const isDark = theme === 'dark';
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        line-height: 1.6;
        color: ${isDark ? '#f8f9fa' : '#212529'};
        background: ${isDark ? '#1a1a1a' : '#f8f9fa'};
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .error-container {
        text-align: center;
        max-width: 600px;
        width: 100%;
        background: ${isDark ? '#2d2d2d' : '#ffffff'};
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, ${isDark ? '0.3' : '0.1'});
        padding: 60px 40px;
        border: ${isDark ? '1px solid #404040' : '1px solid #e9ecef'};
      }
      
      .error-code {
        font-size: 8rem;
        font-weight: 900;
        color: ${isDark ? '#dc3545' : '#dc3545'};
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .error-title {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 20px;
        color: ${isDark ? '#ffffff' : '#212529'};
      }
      
      .error-message {
        font-size: 1.2rem;
        color: ${isDark ? '#adb5bd' : '#6c757d'};
        margin-bottom: 40px;
        line-height: 1.8;
      }
      
      .error-details {
        background: ${isDark ? '#1e1e1e' : '#f8f9fa'};
        border: ${isDark ? '1px solid #404040' : '1px solid #dee2e6'};
        border-radius: 8px;
        padding: 20px;
        margin: 30px 0;
        text-align: left;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9rem;
        color: ${isDark ? '#e9ecef' : '#495057'};
        overflow-x: auto;
      }
      
      .error-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 40px;
      }
      
      .btn {
        display: inline-block;
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1rem;
        transition: all 0.2s ease;
        border: none;
        cursor: pointer;
      }
      
      .btn-primary {
        background: #007bff;
        color: white;
      }
      
      .btn-primary:hover {
        background: #0056b3;
        transform: translateY(-1px);
      }
      
      .btn-secondary {
        background: ${isDark ? '#6c757d' : '#6c757d'};
        color: white;
      }
      
      .btn-secondary:hover {
        background: ${isDark ? '#545b62' : '#545b62'};
        transform: translateY(-1px);
      }
      
      .btn-outline {
        background: transparent;
        color: ${isDark ? '#ffffff' : '#007bff'};
        border: 2px solid ${isDark ? '#ffffff' : '#007bff'};
      }
      
      .btn-outline:hover {
        background: ${isDark ? '#ffffff' : '#007bff'};
        color: ${isDark ? '#1a1a1a' : 'white'};
      }
      
      .error-footer {
        margin-top: 50px;
        padding-top: 30px;
        border-top: 1px solid ${isDark ? '#404040' : '#dee2e6'};
        color: ${isDark ? '#6c757d' : '#6c757d'};
        font-size: 0.9rem;
      }
      
      .error-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        opacity: 0.8;
      }
      
      @media (max-width: 768px) {
        .error-container {
          padding: 40px 20px;
        }
        
        .error-code {
          font-size: 6rem;
        }
        
        .error-title {
          font-size: 2rem;
        }
        
        .error-message {
          font-size: 1.1rem;
        }
        
        .error-actions {
          flex-direction: column;
          align-items: center;
        }
        
        .btn {
          width: 100%;
          max-width: 200px;
        }
      }
    `;
  }

  private static generateBasePage(
    code: number,
    title: string,
    message: string,
    options: ErrorPageOptions = {},
    details?: string
  ): string {
    const opts = { ...this.defaultOptions, ...options };
    const customStyles = opts.customCSS || '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${code} - ${title} | ${opts.brandName}</title>
    <style>
        ${this.getBaseStyles(opts.theme)}
        ${customStyles}
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-code">${code}</div>
        <h1 class="error-title">${title}</h1>
        <p class="error-message">${message}</p>
        
        ${opts.showDetails && details ? `
        <div class="error-details">
            <strong>Error Details:</strong><br>
            ${details}
        </div>
        ` : ''}
        
        <div class="error-actions">
            <a href="${opts.homeUrl}" class="btn btn-primary">Go Home</a>
            <button onclick="window.history.back()" class="btn btn-secondary">Go Back</button>
            <button onclick="window.location.reload()" class="btn btn-outline">Refresh Page</button>
        </div>
        
        <div class="error-footer">
            <p>If you continue to experience problems, please contact us.</p>
            ${opts.supportEmail ? `<p><a href="mailto:${opts.supportEmail}" style="color: #007bff;">${opts.supportEmail}</a></p>` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  static notFound(options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(
      404,
      'Page Not Found',
      'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
      options,
      details
    );
  }

  static internalServerError(options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(
      500,
      'Internal Server Error',
      'We encountered an unexpected error while processing your request. Our team has been notified and is working to resolve the issue.',
      options,
      details
    );
  }

  static forbidden(options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(
      403,
      'Access Forbidden',
      'You do not have permission to access this resource. Please contact an administrator if you believe this is an error.',
      options,
      details
    );
  }

  static unauthorized(options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(
      401,
      'Unauthorized',
      'You need to be authenticated to access this resource. Please log in and try again.',
      { ...options, homeUrl: '/login' },
      details
    );
  }

  static badRequest(options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(
      400,
      'Bad Request',
      'The request could not be understood by the server due to malformed syntax.',
      options,
      details
    );
  }

  static serviceUnavailable(options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(
      503,
      'Service Unavailable',
      'The service is temporarily unavailable due to maintenance or high load. Please try again later.',
      options,
      details
    );
  }

  static tooManyRequests(options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(
      429,
      'Too Many Requests',
      'You have sent too many requests in a given amount of time. Please wait and try again later.',
      options,
      details
    );
  }

  static custom(code: number, title: string, message: string, options: ErrorPageOptions = {}, details?: string): string {
    return this.generateBasePage(code, title, message, options, details);
  }

  // Maintenance page
  static maintenance(options: ErrorPageOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const customStyles = opts.customCSS || '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance - ${opts.brandName}</title>
    <style>
        ${this.getBaseStyles(opts.theme)}
        ${customStyles}
        .maintenance-icon {
            font-size: 6rem;
            margin-bottom: 30px;
            color: #ffc107;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="maintenance-icon">🔧</div>
        <h1 class="error-title">Under Maintenance</h1>
        <p class="error-message">
            We're currently performing scheduled maintenance to improve your experience. 
            We'll be back online shortly.
        </p>
        
        <div class="error-actions">
            <button onclick="window.location.reload()" class="btn btn-primary">Check Again</button>
        </div>
        
        <div class="error-footer">
            <p>Thank you for your patience.</p>
            ${opts.supportEmail ? `<p>Questions? Contact us at <a href="mailto:${opts.supportEmail}" style="color: #007bff;">${opts.supportEmail}</a></p>` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  // Coming soon page
  static comingSoon(options: ErrorPageOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const customStyles = opts.customCSS || '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coming Soon - ${opts.brandName}</title>
    <style>
        ${this.getBaseStyles(opts.theme)}
        ${customStyles}
        .coming-soon-icon {
            font-size: 6rem;
            margin-bottom: 30px;
            color: #28a745;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="coming-soon-icon">🚀</div>
        <h1 class="error-title">Coming Soon</h1>
        <p class="error-message">
            We're working hard to bring you something amazing. 
            Stay tuned for updates!
        </p>
        
        <div class="error-actions">
            <a href="${opts.homeUrl}" class="btn btn-primary">Go Home</a>
        </div>
        
        <div class="error-footer">
            <p>Get notified when we launch.</p>
            ${opts.supportEmail ? `<p><a href="mailto:${opts.supportEmail}" style="color: #007bff;">${opts.supportEmail}</a></p>` : ''}
        </div>
    </div>
</body>
</html>`;
  }
}