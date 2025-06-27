#!/bin/bash

echo "🐬 MySQL Setup Script for Portfolio Application"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if MySQL is installed
check_mysql() {
    if command -v mysql &> /dev/null; then
        echo -e "${GREEN}✅ MySQL is already installed${NC}"
        mysql --version
        return 0
    else
        echo -e "${YELLOW}⚠️  MySQL is not installed${NC}"
        return 1
    fi
}

# Install MySQL based on OS
install_mysql() {
    echo -e "${BLUE}🔧 Installing MySQL...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt &> /dev/null; then
            # Ubuntu/Debian
            sudo apt update
            sudo apt install -y mysql-server mysql-client
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            sudo yum install -y mysql-server mysql
        elif command -v pacman &> /dev/null; then
            # Arch Linux
            sudo pacman -S mysql
        else
            echo -e "${RED}❌ Unsupported Linux distribution${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install mysql
        else
            echo -e "${RED}❌ Homebrew is required for macOS installation${NC}"
            echo "Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported operating system${NC}"
        exit 1
    fi
}

# Start MySQL service
start_mysql() {
    echo -e "${BLUE}🚀 Starting MySQL service...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start mysql
        sudo systemctl enable mysql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mysql
    fi
    
    sleep 3
    
    if pgrep mysql &> /dev/null; then
        echo -e "${GREEN}✅ MySQL service is running${NC}"
    else
        echo -e "${RED}❌ Failed to start MySQL service${NC}"
        exit 1
    fi
}

# Secure MySQL installation
secure_mysql() {
    echo -e "${BLUE}🔒 Setting up MySQL security...${NC}"
    echo -e "${YELLOW}Please follow the prompts to secure your MySQL installation${NC}"
    
    # Run mysql_secure_installation if available
    if command -v mysql_secure_installation &> /dev/null; then
        mysql_secure_installation
    else
        echo -e "${YELLOW}⚠️  mysql_secure_installation not found, skipping...${NC}"
    fi
}

# Create database and user
create_database() {
    echo -e "${BLUE}🗄️  Creating portfolio database...${NC}"
    
    echo "Enter MySQL root password:"
    read -s ROOT_PASSWORD
    
    # Create database
    mysql -u root -p"$ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS portfolio;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database 'portfolio' created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create database. Please check your root password.${NC}"
        echo -e "${YELLOW}💡 You can create it manually: mysql -u root -p${NC}"
        echo -e "${YELLOW}   Then run: CREATE DATABASE portfolio;${NC}"
    fi
    
    # Optional: Create a dedicated user
    echo -e "${YELLOW}Do you want to create a dedicated user for the portfolio app? (y/n)${NC}"
    read -r CREATE_USER
    
    if [[ $CREATE_USER == "y" || $CREATE_USER == "Y" ]]; then
        echo "Enter username for portfolio app (default: portfolio_user):"
        read DB_USER
        DB_USER=${DB_USER:-portfolio_user}
        
        echo "Enter password for $DB_USER:"
        read -s DB_PASSWORD
        
        mysql -u root -p"$ROOT_PASSWORD" -e "
            CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
            GRANT ALL PRIVILEGES ON portfolio.* TO '$DB_USER'@'localhost';
            FLUSH PRIVILEGES;
        " 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ User '$DB_USER' created successfully${NC}"
            
            # Create .env file
            cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=portfolio
DB_PORT=3306

# Application Configuration
PORT=3000
NODE_ENV=development
EOF
            echo -e "${GREEN}✅ .env file created with database configuration${NC}"
        else
            echo -e "${RED}❌ Failed to create user${NC}"
        fi
    fi
}

# Test database connection
test_connection() {
    echo -e "${BLUE}🔌 Testing database connection...${NC}"
    
    if [ -f ".env" ]; then
        source .env
        
        # Test connection with user from .env
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 'Connection successful!' as status;" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Database connection test successful${NC}"
        else
            echo -e "${RED}❌ Database connection test failed${NC}"
            echo -e "${YELLOW}💡 Please check your .env configuration${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  .env file not found, skipping connection test${NC}"
    fi
}

# Install Node.js dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing application dependencies...${NC}"
    
    if command -v bun &> /dev/null; then
        bun install
        echo -e "${GREEN}✅ Dependencies installed with Bun${NC}"
    elif command -v npm &> /dev/null; then
        npm install
        echo -e "${GREEN}✅ Dependencies installed with npm${NC}"
    else
        echo -e "${RED}❌ Neither Bun nor npm found${NC}"
        echo -e "${YELLOW}💡 Please install Bun or Node.js first${NC}"
    fi
}

# Main installation process
main() {
    echo -e "${BLUE}Starting MySQL setup for Portfolio Application...${NC}"
    echo ""
    
    # Check if MySQL is already installed
    if ! check_mysql; then
        echo -e "${YELLOW}Do you want to install MySQL? (y/n)${NC}"
        read -r INSTALL_MYSQL
        
        if [[ $INSTALL_MYSQL == "y" || $INSTALL_MYSQL == "Y" ]]; then
            install_mysql
        else
            echo -e "${YELLOW}⚠️  Skipping MySQL installation${NC}"
            echo -e "${YELLOW}💡 Please install MySQL manually and run this script again${NC}"
            exit 0
        fi
    fi
    
    # Start MySQL service
    start_mysql
    
    # Secure installation (optional)
    echo -e "${YELLOW}Do you want to run MySQL secure installation? (y/n)${NC}"
    read -r SECURE_MYSQL
    
    if [[ $SECURE_MYSQL == "y" || $SECURE_MYSQL == "Y" ]]; then
        secure_mysql
    fi
    
    # Create database
    create_database
    
    # Test connection
    test_connection
    
    # Install dependencies
    install_dependencies
    
    echo ""
    echo -e "${GREEN}🎉 MySQL setup completed!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${YELLOW}1. Start the portfolio application:${NC}"
    echo -e "   bun examples/portfolio.ts"
    echo ""
    echo -e "${YELLOW}2. Open your browser:${NC}"
    echo -e "   http://localhost:3000"
    echo ""
    echo -e "${YELLOW}3. View the API:${NC}"
    echo -e "   http://localhost:3000/api/projects"
    echo ""
    echo -e "${BLUE}Configuration files created:${NC}"
    echo -e "   📄 .env - Database configuration"
    echo ""
    echo -e "${BLUE}Database details:${NC}"
    echo -e "   🗄️  Database: portfolio"
    echo -e "   📊 Tables: projects (auto-created)"
    echo -e "   🌱 Sample data will be seeded automatically"
}

# Run main function
main "$@"