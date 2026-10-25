Python设计模式：23种经典模式的实现
设计模式是软件开发中的重要概念，它们提供了解决常见问题的通用方案。在Python中，我们可以灵活地应用这些模式，以提高代码的可维护性、可扩展性和可重用性。本文将介绍23种经典设计模式在Python中的实现，帮助大家提升代码设计水平。



创建型模式

1. 单例模式（Singleton Pattern）
单例模式确保一个类只有一个实例，并提供一个全局访问点。



        class Singleton：
            _instance = None
        
            def __new__(cls)：
                if cls._instance is None：
                    cls._instance = super().__new__(cls)
                return cls._instance
    
        #使用示例
        s1 = Singleton()
        s2 = Singleton()
        print(s1 is s2)  # 输出： True

温馨提示：Python的模块天生就是单例的，可以直接利用模块级别的变量实现单例。



2. 工厂方法模式（Factory Method Pattern）
工厂方法模式定义了一个创建对象的接口，但由子类决定要实例化的类是哪一个。



        from abc import ABC， abstractmethod
        
        class Animal(ABC)：
            @abstractmethod
            def speak(self)：
                pass
        
        class Dog(Animal)：
            def speak(self)：
                return “Woof！”
        
        class Cat(Animal)：
            def speak(self)：
                return “Meow！”
        
        class AnimalFactory：
            def create_animal(self， animal_type)：
                if animal_type == “dog”：
                    return Dog()
                elif animal_type == “cat”：
                    return Cat()
                else：
                    raise ValueError(“Unknown animal type”)
        
        #使用示例
        factory = AnimalFactory()
        dog = factory.create_animal(“dog”)
        print(dog.speak())  # 输出： Woof！

3. 抽象工厂模式（Abstract Factory Pattern）
抽象工厂模式提供一个创建一系列相关或相互依赖对象的接口，而无需指定它们具体的类。



        from abc import ABC， abstractmethod
        
        class Button(ABC)：
            @abstractmethod
            def paint(self)：
                pass
        
        class MacButton(Button)：
            def paint(self)：
                return “Rendering a button in macOS style”
        
        class WindowsButton(Button)：
            def paint(self)：
                return “Rendering a button in Windows style”
        
        class GUIFactory(ABC)：
            @abstractmethod
            def create_button(self)：
                pass
        
        class MacFactory(GUIFactory)：
            def create_button(self)：
                return MacButton()
        
        class WindowsFactory(GUIFactory)：
            def create_button(self)：
                return WindowsButton()
        
        #使用示例
        def create_gui(factory)：
            button = factory.create_button()
            return button.paint()
        
        print(create_gui(MacFactory()))  # 输出： Rendering a button in macOS style
        print(create_gui(WindowsFactory()))  # 输出： Rendering a button in Windows style

结构型模式

4. 适配器模式（Adapter Pattern）
适配器模式允许将一个类的接口转换成客户端所期望的另一个接口。



        class OldPrinter：
            def print_old(self， text)：
                return f“Old Printer： {text}”
        
        class NewPrinter：
            def print_new(self， text)：
                return f“New Printer： {text}”
        
        class PrinterAdapter：
            def __init__(self， printer)：
                self.printer = printer
        
            def print(self， text)：
                if isinstance(self.printer， OldPrinter)：
                    return self.printer.print_old(text)
                elif isinstance(self.printer， NewPrinter)：
                    return self.printer.print_new(text)
        
        #使用示例
        old_printer = OldPrinter()
        new_printer = NewPrinter()
        
        adapter1 = PrinterAdapter(old_printer)
        adapter2 = PrinterAdapter(new_printer)
        
        print(adapter1.print(“Hello”))  # 输出： Old Printer： Hello
        print(adapter2.print(“World”))  # 输出： New Printer： World

5. 装饰器模式（Decorator Pattern）
装饰器模式允许向一个现有的对象添加新的功能，同时又不改变其结构。



        class Coffee：
            def get_cost(self)：
                return 5
        
            def get_description(self)：
                return “Simple coffee”
        
        class CoffeeDecorator：
            def __init__(self， coffee)：
                self._coffee = coffee
        
            def get_cost(self)：
                return self._coffee.get_cost()
        
            def get_description(self)：
                return self._coffee.get_description()
        
        class Milk(CoffeeDecorator)：
            def get_cost(self)：
                return self._coffee.get_cost() + 2
        
            def get_description(self)：
                return f“{self._coffee.get_description()}， milk”
        
        class Sugar(CoffeeDecorator)：
            def get_cost(self)：
                return self._coffee.get_cost() + 1
        
            def get_description(self)：
                return f“{self._coffee.get_description()}， sugar”
        
        #使用示例
        coffee = Coffee()
        coffee_with_milk = Milk(coffee)
        coffee_with_milk_and_sugar = Sugar(coffee_with_milk)
        
        print(coffee_with_milk_and_sugar.get_cost())  # 输出： 8
        print(coffee_with_milk_and_sugar.get_description())  # 输出： Simple coffee， milk， sugar

温馨提示：Python的装饰器语法(@decorator)是这种模式的一种简化实现，但它们不完全等同。



行为型模式

6. 观察者模式（Observer Pattern）
观察者模式定义了一种一对多的依赖关系，让多个观察者对象同时监听某一个主题对象。



        class Subject：
            def __init__(self)：
                self._observers = []
                self._state = None
        
            def attach(self， observer)：
                self._observers.append(observer)
        
            def detach(self， observer)：
                self._observers.remove(observer)
        
            def notify(self)：
                for observer in self._observers：
                    observer.update(self._state)
        
            def set_state(self， state)：
                self._state = state
                self.notify()
        
        class Observer：
            def update(self， state)：
                pass
        
        class ConcreteObserver(Observer)：
            def update(self， state)：
                print(f“Observer： My new state is {state}”)
        
        #使用示例
        subject = Subject()
        observer1 = ConcreteObserver()
        observer2 = ConcreteObserver()
        
        subject.attach(observer1)
        subject.attach(observer2)
        
        subject.set_state(123)  # 两个观察者都会输出： Observer： My new state is 123

7. 策略模式（Strategy Pattern）
策略模式定义了一系列的算法，并将每一个算法封装起来，使它们可以相互替换。



        from abc import ABC， abstractmethod
        
        class Strategy(ABC)：
            @abstractmethod
            def execute(self， data)：
                pass
        
        class ConcreteStrategyA(Strategy)：
            def execute(self， data)：
                return sorted(data)
        
        class ConcreteStrategyB(Strategy)：
            def execute(self， data)：
                return sorted(data， reverse=True)
        
        class Context：
            def __init__(self， strategy)：
                self._strategy = strategy
        
            def set_strategy(self， strategy)：
                self._strategy = strategy
        
            def execute_strategy(self， data)：
                return self._strategy.execute(data)
        
        #使用示例
        data = [3， 1， 4， 1， 5， 9， 2， 6， 5， 3， 5]
        
        context = Context(ConcreteStrategyA())
        print(context.execute_strategy(data))  # 输出： [1， 1， 2， 3， 3， 4， 5， 5， 5， 6， 9]
        
        context.set_strategy(ConcreteStrategyB())
        print(context.execute_strategy(data))  # 输出： [9， 6， 5， 5， 5， 4， 3， 3， 2， 1， 1]

这只是23种经典设计模式中的一部分。每种模式都有其特定的使用场景和优势。在实际开发中，我们应该根据具体需求选择合适的设计模式，而不是为了使用设计模式而使用设计模式。



记住，设计模式是编程经验的总结，不是银弹。好的代码设计应该是简单、清晰、易于理解和维护的。过度使用设计模式可能会导致代码变得复杂和难以理解。在应用设计模式时，我们需要权衡利弊，选择最适合当前问题的解决方案。
