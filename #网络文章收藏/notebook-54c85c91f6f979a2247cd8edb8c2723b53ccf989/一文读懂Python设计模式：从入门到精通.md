设计模式是软件开发中的“套路”，就像武功招式一样，掌握了这些套路能帮我们写出更优雅、更容易维护的代码。不过很多小伙伴一看到设计模式就头大，觉得特别抽象难懂。今天我就用最接地气的方式，带大家一起搞懂Python中的几个常用设计模式。



单例模式：独一无二的存在
单例模式可能是最简单的设计模式了，它确保一个类只有一个实例。打个比方，就像老婆，你只能有一个（不是）。



        class Database：
        
                _instance = None
                
                        def __new__(cls)：
                        
                                if cls._instance is None：
                                
                                cls._instance = super().__new__(cls)
                                
                                return cls._instance
                
                        def __init__(self)：
                        
                                # 数据库连接等初始化操作
                                
                                pass
                
        # 测试代码
        
        db1 = Database()
        
        db2 = Database()
        
        print(db1 is db2)  # 输出： True



⚠️ 小贴士：



Python中实现单例模式要用__new__方法，而不是__init__

多线程环境下需要加锁保证线程安全

模块级别的变量天然就是单例的，有时候不需要显式实现单例类



工厂模式：对象生产流水线
工厂模式就像一个生产对象的工厂，客户不需要知道具体怎么造的，只管要什么拿什么。



        class Animal：
        
                def speak(self)：
                
                        pass
        
        class Dog(Animal)：
        
                def speak(self)：
                
                        return “汪汪汪”
        
        class Cat(Animal)：
        
                def speak(self)：
                
                        return “喵喵喵”
        
        class AnimalFactory：
        
                def create_animal(self， animal_type)：
                
                        if animal_type == “dog”：
                        
                                return Dog()
                
                        elif animal_type == “cat”：
                
                                return Cat()
                
                        else:
                                raise ValueError(“不支持的动物类型”)
        
        # 使用示例
        
        factory = AnimalFactory()
        
        dog = factory.create_animal(“dog”)
        
        print(dog.speak())  # 输出： 汪汪汪



观察者模式：订阅你的爱豆
观察者模式就像关注了一个UP主，UP主更新视频时所有粉丝都会收到通知。










        class YouTuber：
        
                def __init__(self)：
                
                        self._observers = []
                        
                        self._latest_video = None
                
                def attach(self， observer)：
                
                        self._observers.append(observer)
                
                def notify(self)：
                
                        for observer in self._observers：
                        
                        observer.update(self._latest_video)
                
                def upload_video(self， video)：
                
                        self._latest_video = video
                        
                        self.notify()
        
        class Follower：
        
                def __init__(self， name)：
                
                        self.name = name
                
                def update(self， video)：
                
                        print(f“{self.name}： 哇！UP主更新了视频《{video}》”)
        
        # 使用示例
        
        up = YouTuber()
        
        fan1 = Follower(“小明”)
        
        fan2 = Follower(“小红”)
        
        up.attach(fan1)
        
        up.attach(fan2)
        
        up.upload_video(“Python设计模式讲解”)



⚠️ 小贴士：



观察者模式要注意内存泄漏问题，记得提供取消订阅的方法

Python内置的asyncio就大量使用了观察者模式



装饰器模式：给对象穿新衣
装饰器模式可以动态地给对象添加新功能，就像给角色换装一样。Python语言直接内置了装饰器语法糖，超级方便。




        def log_calls(func)：
        
                def wrapper(*args， **kwargs)：
                
                        print(f“调用函数： {func.__name__}”)
                        
                        result = func(*args， **kwargs)
                        
                        print(f“函数返回： {result}”)
                        
                        return result
                
                return wrapper
        
        @log_calls
        
        def add(a， b)：
        
                return a + b
        
        # 测试代码
        
        add(1， 2)  # 会打印调用信息



⚠️ 小贴士：



装饰器嵌套顺序很重要，从下往上执行

使用functools.wraps保留原函数的元信息

类装饰器也是一种选择，适合更复杂的场景



真实项目中，设计模式经常是混着用的。比如一个网络请求库，可能同时用到单例模式（连接池）、工厂模式（创建请求对象）和装饰器模式（添加重试逻辑）。



设计模式不是万能药，用对了是武器，用错了就成了负担。写代码时记住一点： 保持简单 。当代码变得复杂难懂时，才考虑用设计模式重构。不要为了用设计模式而用设计模式。
