/**
 * Currency Service with OpenAI-powered real-time exchange rates
 */

export interface CurrencyConversion {
  original_amount: number;
  original_currency: string;
  converted_amount: number;
  target_currency: string;
  exchange_rate: number;
  conversion_date: string;
  source: 'openai' | 'fallback';
}

export interface CurrencyInfo {
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
}

export class CurrencyService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Get real-time currency conversion using OpenAI
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    try {
      // If same currency, return as-is
      if (fromCurrency === toCurrency) {
        return {
          original_amount: amount,
          original_currency: fromCurrency,
          converted_amount: amount,
          target_currency: toCurrency,
          exchange_rate: 1,
          conversion_date: new Date().toISOString().split('T')[0],
          source: 'openai'
        };
      }

      console.log(`Converting ${amount} ${fromCurrency} to ${toCurrency} using OpenAI...`);

      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        console.warn('OpenAI API key not available, using fallback rates');
        return this.getFallbackConversion(amount, fromCurrency, toCurrency);
      }

      const prompt = `Convert ${amount} ${fromCurrency} to ${toCurrency} using the current real exchange rate as of today.

IMPORTANT: Use the actual current exchange rate, not 1:1 conversion.

Return ONLY valid JSON in this exact format:
{
  "original_amount": ${amount},
  "original_currency": "${fromCurrency}",
  "converted_amount": [ACTUAL_CONVERTED_AMOUNT],
  "target_currency": "${toCurrency}",
  "exchange_rate": [ACTUAL_EXCHANGE_RATE],
  "conversion_date": "${new Date().toISOString().split('T')[0]}"
}

Example: If converting 100 USD to AED, and current rate is 1 USD = 3.67 AED, then:
- converted_amount should be 367.00
- exchange_rate should be 3.67

Use real current exchange rates, not placeholder values.`;

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a financial expert with access to current exchange rates. Always use real, current exchange rates for currency conversion. Never use 1:1 or placeholder rates.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        console.error(`OpenAI API error: ${response.status}`);
        return this.getFallbackConversion(amount, fromCurrency, toCurrency);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.error('No response from OpenAI');
        return this.getFallbackConversion(amount, fromCurrency, toCurrency);
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No valid JSON found in OpenAI response');
        return this.getFallbackConversion(amount, fromCurrency, toCurrency);
      }

      const conversionData = JSON.parse(jsonMatch[0]);
      
      // Validate the conversion data
      if (!conversionData.converted_amount || !conversionData.exchange_rate) {
        console.error('Invalid conversion data from OpenAI');
        return this.getFallbackConversion(amount, fromCurrency, toCurrency);
      }

      const result: CurrencyConversion = {
        original_amount: amount,
        original_currency: fromCurrency,
        converted_amount: parseFloat(conversionData.converted_amount.toFixed(2)),
        target_currency: toCurrency,
        exchange_rate: parseFloat(conversionData.exchange_rate.toFixed(6)),
        conversion_date: new Date().toISOString().split('T')[0],
        source: 'openai'
      };

      console.log(`✅ OpenAI Conversion: ${amount} ${fromCurrency} = ${result.converted_amount} ${toCurrency} (Rate: ${result.exchange_rate})`);
      return result;

    } catch (error) {
      console.error('OpenAI currency conversion error:', error);
      return this.getFallbackConversion(amount, fromCurrency, toCurrency);
    }
  }

  /**
   * Get currency information for a country using OpenAI
   */
  static async getCurrencyForCountry(country: string): Promise<CurrencyInfo> {
    try {
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        return this.getFallbackCurrencyForCountry(country);
      }

      console.log(`Getting currency for country: ${country}`);

      const prompt = `What is the official currency for ${country}? 

Return ONLY valid JSON in this exact format:
{
  "currency_code": "USD",
  "currency_name": "US Dollar",
  "currency_symbol": "$"
}

Examples:
- United Arab Emirates: {"currency_code": "AED", "currency_name": "UAE Dirham", "currency_symbol": "د.إ"}
- United Kingdom: {"currency_code": "GBP", "currency_name": "British Pound", "currency_symbol": "£"}
- United States: {"currency_code": "USD", "currency_name": "US Dollar", "currency_symbol": "$"}`;

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a currency expert. Return accurate currency information for countries in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        console.error(`OpenAI API error: ${response.status}`);
        return this.getFallbackCurrencyForCountry(country);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.error('No response from OpenAI');
        return this.getFallbackCurrencyForCountry(country);
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No valid JSON found in OpenAI response');
        return this.getFallbackCurrencyForCountry(country);
      }

      const currencyData = JSON.parse(jsonMatch[0]);
      
      const result: CurrencyInfo = {
        currency_code: currencyData.currency_code || 'USD',
        currency_name: currencyData.currency_name || 'US Dollar',
        currency_symbol: currencyData.currency_symbol || '$'
      };

      console.log(`✅ Currency for ${country}: ${result.currency_code} (${result.currency_symbol})`);
      return result;

    } catch (error) {
      console.error('OpenAI currency detection error:', error);
      return this.getFallbackCurrencyForCountry(country);
    }
  }

  /**
   * Fallback conversion with realistic exchange rates (updated regularly)
   */
  private static getFallbackConversion(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): CurrencyConversion {
    console.log(`Using fallback conversion: ${amount} ${fromCurrency} to ${toCurrency}`);

    // Realistic exchange rates as of December 2024
    const exchangeRates: { [key: string]: { [key: string]: number } } = {
      'USD': {
        'AED': 3.67, 'GBP': 0.79, 'EUR': 0.95, 'CAD': 1.41, 'AUD': 1.56,
        'JPY': 149.50, 'INR': 84.20, 'CNY': 7.25, 'CHF': 0.88, 'SEK': 10.85,
        'NOK': 11.20, 'DKK': 7.08, 'SGD': 1.35, 'HKD': 7.78, 'MYR': 4.48,
        'THB': 34.50, 'KRW': 1420.00, 'BRL': 6.15, 'MXN': 20.25, 'SAR': 3.75,
        'QAR': 3.64, 'KWD': 0.31, 'BHD': 0.38, 'OMR': 0.38, 'ILS': 3.65,
        'TRY': 34.20, 'RUB': 95.50, 'PLN': 4.05, 'CZK': 23.80, 'HUF': 385.00,
        'ZAR': 18.25, 'EGP': 49.50, 'NZD': 1.72
      },
      'AED': {
        'USD': 0.27, 'GBP': 0.22, 'EUR': 0.26, 'CAD': 0.38, 'AUD': 0.42,
        'JPY': 40.75, 'INR': 22.95, 'CNY': 1.98, 'CHF': 0.24, 'SEK': 2.96
      },
      'GBP': {
        'USD': 1.27, 'AED': 4.65, 'EUR': 1.20, 'CAD': 1.78, 'AUD': 1.97,
        'JPY': 189.50, 'INR': 106.85, 'CNY': 9.20, 'CHF': 1.11, 'SEK': 13.75
      },
      'EUR': {
        'USD': 1.05, 'AED': 3.86, 'GBP': 0.83, 'CAD': 1.48, 'AUD': 1.64,
        'JPY': 157.25, 'INR': 88.45, 'CNY': 7.61, 'CHF': 0.93, 'SEK': 11.40
      }
    };

    let exchangeRate = 1;
    
    if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency][toCurrency]) {
      exchangeRate = exchangeRates[fromCurrency][toCurrency];
    } else if (exchangeRates[toCurrency] && exchangeRates[toCurrency][fromCurrency]) {
      exchangeRate = 1 / exchangeRates[toCurrency][fromCurrency];
    } else {
      // If no rate found, use USD as intermediate currency
      const fromToUsd = exchangeRates[fromCurrency]?.['USD'] || 1;
      const usdToTarget = exchangeRates['USD']?.[toCurrency] || 1;
      exchangeRate = fromToUsd * usdToTarget;
    }

    const convertedAmount = amount * exchangeRate;

    return {
      original_amount: amount,
      original_currency: fromCurrency,
      converted_amount: parseFloat(convertedAmount.toFixed(2)),
      target_currency: toCurrency,
      exchange_rate: parseFloat(exchangeRate.toFixed(6)),
      conversion_date: new Date().toISOString().split('T')[0],
      source: 'fallback'
    };
  }

  /**
   * Fallback currency mapping for common countries
   */
  private static getFallbackCurrencyForCountry(country: string): CurrencyInfo {
    const countryLower = country.toLowerCase();
    
    const currencyMap: { [key: string]: CurrencyInfo } = {
      'united states': { currency_code: 'USD', currency_name: 'US Dollar', currency_symbol: '$' },
      'usa': { currency_code: 'USD', currency_name: 'US Dollar', currency_symbol: '$' },
      'uae': { currency_code: 'AED', currency_name: 'UAE Dirham', currency_symbol: 'د.إ' },
      'united arab emirates': { currency_code: 'AED', currency_name: 'UAE Dirham', currency_symbol: 'د.إ' },
      'uk': { currency_code: 'GBP', currency_name: 'British Pound', currency_symbol: '£' },
      'united kingdom': { currency_code: 'GBP', currency_name: 'British Pound', currency_symbol: '£' },
      'canada': { currency_code: 'CAD', currency_name: 'Canadian Dollar', currency_symbol: 'C$' },
      'australia': { currency_code: 'AUD', currency_name: 'Australian Dollar', currency_symbol: 'A$' },
      'germany': { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€' },
      'france': { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€' },
      'italy': { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€' },
      'spain': { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€' },
      'netherlands': { currency_code: 'EUR', currency_name: 'Euro', currency_symbol: '€' },
      'japan': { currency_code: 'JPY', currency_name: 'Japanese Yen', currency_symbol: '¥' },
      'india': { currency_code: 'INR', currency_name: 'Indian Rupee', currency_symbol: '₹' },
      'china': { currency_code: 'CNY', currency_name: 'Chinese Yuan', currency_symbol: '¥' },
      'switzerland': { currency_code: 'CHF', currency_name: 'Swiss Franc', currency_symbol: 'CHF' },
      'sweden': { currency_code: 'SEK', currency_name: 'Swedish Krona', currency_symbol: 'kr' },
      'norway': { currency_code: 'NOK', currency_name: 'Norwegian Krone', currency_symbol: 'kr' },
      'denmark': { currency_code: 'DKK', currency_name: 'Danish Krone', currency_symbol: 'kr' },
      'singapore': { currency_code: 'SGD', currency_name: 'Singapore Dollar', currency_symbol: 'S$' },
      'hong kong': { currency_code: 'HKD', currency_name: 'Hong Kong Dollar', currency_symbol: 'HK$' },
      'south korea': { currency_code: 'KRW', currency_name: 'South Korean Won', currency_symbol: '₩' },
      'brazil': { currency_code: 'BRL', currency_name: 'Brazilian Real', currency_symbol: 'R$' },
      'mexico': { currency_code: 'MXN', currency_name: 'Mexican Peso', currency_symbol: '$' },
      'saudi arabia': { currency_code: 'SAR', currency_name: 'Saudi Riyal', currency_symbol: '﷼' },
      'qatar': { currency_code: 'QAR', currency_name: 'Qatari Riyal', currency_symbol: '﷼' },
      'kuwait': { currency_code: 'KWD', currency_name: 'Kuwaiti Dinar', currency_symbol: 'د.ك' },
      'bahrain': { currency_code: 'BHD', currency_name: 'Bahraini Dinar', currency_symbol: '.د.ب' },
      'oman': { currency_code: 'OMR', currency_name: 'Omani Rial', currency_symbol: '﷼' }
    };

    return currencyMap[countryLower] || { 
      currency_code: 'USD', 
      currency_name: 'US Dollar', 
      currency_symbol: '$' 
    };
  }

  /**
   * Format currency amount with proper symbol
   */
  static formatCurrency(amount: number, currencyCode: string): string {
    const currencySymbols: { [key: string]: string } = {
      'USD': '$', 'AED': 'د.إ', 'GBP': '£', 'EUR': '€', 'CAD': 'C$',
      'AUD': 'A$', 'JPY': '¥', 'INR': '₹', 'CNY': '¥', 'CHF': 'CHF',
      'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'SGD': 'S$', 'HKD': 'HK$',
      'MYR': 'RM', 'THB': '฿', 'KRW': '₩', 'BRL': 'R$', 'MXN': '$',
      'SAR': '﷼', 'QAR': '﷼', 'KWD': 'د.ك', 'BHD': '.د.ب', 'OMR': '﷼'
    };

    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    // Format based on currency
    if (currencyCode === 'JPY' || currencyCode === 'KRW') {
      // No decimal places for Yen and Won
      return `${symbol}${Math.round(amount).toLocaleString()}`;
    } else {
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  /**
   * Test if OpenAI API is available for currency conversion
   */
  static async testCurrencyAPI(): Promise<boolean> {
    try {
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        return false;
      }

      // Test with a simple conversion
      const result = await this.convertCurrency(100, 'USD', 'EUR');
      return result.source === 'openai';
    } catch (error) {
      console.error('Currency API test failed:', error);
      return false;
    }
  }
}