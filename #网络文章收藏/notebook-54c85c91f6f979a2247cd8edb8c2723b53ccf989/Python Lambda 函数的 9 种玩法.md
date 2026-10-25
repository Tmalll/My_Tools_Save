1.简单的算术运算：
        add = lambda x, y: x + y
        subtract = lambda x, y: x - y
        multiply = lambda x, y: x * y
        divide = lambda x, y: x / y
        
        print(add(3, 5))        
        print(subtract(8, 3))    
        print(multiply(4, 6))   
        print(divide(10, 2))
        8
        5
        24
        5.0
2.对元组列表进行排序：
        pairs = [(1, 5), (2, 3), (4, 1), (3, 8)]
        sorted_pairs = sorted(pairs, key=lambda x: x[1])
        print(sorted_pairs)  
        [(4, 1), (2, 3), (1, 5), (3, 8)]
3. 过滤列表：
        numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        even_numbers = list(filter(lambda x: x % 2 == 0, numbers))
        print(even_numbers)  
        [2, 4, 6, 8]
4.将函数映射到列表：
        numbers = [1, 2, 3, 4, 5]
        squared_numbers = list(map(lambda x: x**2, numbers))
        print(squared_numbers)  
        [1, 4, 9, 16, 25]
5.使用 Lambda、 map 和 filter：
        # 使用 map 将列表中的每个元素加倍
        
        numbers = [1, 2, 3, 4, 5]
        doubled_numbers = list(map(lambda x: x * 2, numbers))
        print(doubled_numbers)  
        
        # 使用 filter 过滤奇数
        
        odd_numbers = list(filter(lambda x: x % 2 != 0, numbers))
        print(odd_numbers)
        [2, 4, 6, 8, 10]
        [1, 3, 5]
6.在关键函数中使用 Lambda：
        # 根据每个字符串的长度对字符串列表进行排序
        words = ['apple', 'banana', 'kiwi', 'orange']
        sorted_words = sorted(words, key=lambda x: len(x))
        print(sorted_words)  
        
        ['kiwi', 'apple', 'banana', 'orange']
7. 动态创建函数：
        # 使用 lambda 函数创建一个简单的计算器
        calculator = {
            'add': lambda x, y: x + y,
            'subtract': lambda x, y: x - y,
            'multiply': lambda x, y: x * y,
            'divide': lambda x, y: x / y,
        }
        
        result = calculator['multiply'](4, 5)
        print(result)  
        20
8.在列表推导中使用 Lambda：
        # 使用列表推导对列表中每个元素求平方
        numbers = [1, 2, 3, 4, 5]
        squared_numbers = [(lambda x: x**2)(x) for x in numbers]
        print(squared_numbers) 
        #clcoding.com
        [1, 4, 9, 16, 25]
9.高阶函数中的 Lambda：
        # 以函数作为参数的高阶函数
        def  operand_on_numbers ( x, y, operation ): 
            return operation(x, y) 
        
        # 使用 lambda 函数作为参数
        result = operand_on_numbers( 10 , 5 , lambda x, y: x / y) 
        print(result)
        2.0
