FROM php:8.2-apache

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Set the document root to the backend directory
ENV APACHE_DOCUMENT_ROOT /var/www/html/backend

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Configure Apache to listen on $PORT provided by Render, or 80 locally
RUN echo "Listen \${PORT:-80}" > /etc/apache2/ports.conf
RUN sed -ri -e 's!<VirtualHost \*:80>!<VirtualHost *:\${PORT:-80}>!g' /etc/apache2/sites-available/*.conf

# Enable Apache mod_headers and mod_rewrite
RUN a2enmod headers
RUN a2enmod rewrite

# Copy the entire dashboard-web-app project into /var/www/html
# (This includes parsed_data.json and the backend folder)
COPY . /var/www/html/

# Adjust Permissions
RUN chown -R www-data:www-data /var/www/html
