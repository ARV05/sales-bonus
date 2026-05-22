/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    //Рассчитываем коэффициент для расчёта суммы без скидки
    const discountCoefficient = 1 - (discount / 100);
    //Рассчитываем выручку по формуле
    const revenue = sale_price * quantity * discountCoefficient;
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (index === 0) { // Первый место
        return profit * 0.15;
    } else if (index === 1 || index === 2) { // Второе и третье место
        return profit * 0.10;
    } else if (index === total - 1) { // Последнее место
        return 0;
    } else { // Все остальные
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || 
        !data.sellers || 
        !Array.isArray(data.sellers) || 
        data.sellers.length === 0 ||
        
        !data.products || 
        !Array.isArray(data.products) || 
        data.products.length === 0 ||
        
        !data.purchase_records || 
        !Array.isArray(data.purchase_records)) {
        
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;
    
    // Проверка функций
    if (typeof calculateRevenue !== 'function') {
        throw new Error('Функция расчёта выручки не предоставлена');
    }
    if (typeof calculateBonus !== 'function') {
        throw new Error('Функция расчёта бонуса не предоставлена');
    }

    if (data.purchase_records.length === 0) {
        throw new Error('Массив purchase_records не должен быть пустым');
    }
    
    // Подготовка статистики продавцов
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));
    
    // Создание индексов
    const sellerIndex = Object.fromEntries(data.sellers.map(seller => [seller.id, seller]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));
    
    // Обработка чеков
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (!seller) return;
        
        const sellerStat = sellerStats.find(stat => stat.id === seller.id);
        
        if (!sellerStat) return;
        
        // Обновление статистики продаж
        sellerStat.sales_count++;
        sellerStat.revenue += record.total_amount;
        
        // Обработка товаров в чеке
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            if (!product) return;
            
            // Расчёт себестоимости
            const cost = product.purchase_price * item.quantity;
            
            // Расчёт выручки
            const revenue = calculateRevenue(item, product);
            
            // Расчёт прибыли
            const profit = revenue - cost;
            sellerStat.profit += profit;
            
            // Обновление количества проданных товаров
            if (!sellerStat.products_sold[item.sku]) {
                sellerStat.products_sold[item.sku] = 0;
            }
            sellerStat.products_sold[item.sku] += item.quantity;
        });
    });
    
    // Сортировка продавцов по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);
    
    // Расчёт бонусов и топа товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(
            index, 
            sellerStats.length, 
            seller
        );
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });
    
    // Формирование итогового результата
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
