“那你说说，设计模式的原则是什么？” 吉森问道。 

“1. 面向接口编程，而不是面向实现编程。2. 优先使用组合而不是继承。” 这是难不住特使的。

 “Python连接口都没有，怎么面向接口编程？”  吉森问道。 

特使哈哈大笑：“说你是半吊子吧，你还不服，你以为这里的接口就是你们Java的interface啊！你忘了Python的Duck Typing了？” 

        class Duck:
            def fly(self):
                print("Duck flying")
        
        class Airplane:
            def fly(self):
                print("Airplane flying")
        
        
        def lift_off(entity):
            entity.fly()
        
        
        duck = Duck()
        plane = Airplane()
        
        lift_off(duck)
        lift_off(plane)


“看到没有， Duck和Airplane都没有实现你所谓的接口，但是都可以调用fly()方法，这难道不是面向接口编程， 如果你非要类比的话，这个fly就是一个自动化的接口啊。” 



吉森确实没想到这一层，至于第二个原则，优先使用组合而不是继承，可以是每个面向对象的语言都可以实现的，他叹了口气，也就不问了。 



Adapter模式


        #特使接着说：“Duck Typing非常强大，你不是提到了设计模式吗，在Duck Typing面前，很多设计模式纯属多此一举。我来给你举个例子，Adapter模式。假设客户端有这么一段代码，可以把一段日志写入文件当中。” 
        
        
        
        def log(file,msg):
            file.write('[{}] - {}'.format(datetime.now(), msg))
        
        
        #“现在来了新的需求，要把日志写入数据库， 而数据库并没有write 方法，怎么办？ 那就写个Adapter吧。” 
        
        
        
        class DBAdapter:
            def __init__(self, db):
                self.db = db
        
            def write(self, msg):
                self.db.insert(msg)
        
        
        #“注意这个DBAdapter并不需要实现什么接口（我大Python也没有接口），就是一个单独的类，只需要有个write方法就可以了。” 
        
        
        
        db_adapter = DBAdapter(db)
        log(db_adapter, "sev1 error occurred")


确实是很简单，只要有write 方法， 不管你是任何对象，都可以进行调用， 典型的Duck Typing 。   

既然Adapter可以这么写，那Proxy模式也是类似了，只要你的Proxy类和被代理的类的方法一样，那就可以被客户使用。 

但是这种方法的弊端就是，不知道log方法的参数类型，想要重构可就难了。 


单例模式

吉森又想到了一个问题，继续挑战特使：“Python连个private 关键字都没有，怎么隐藏一个类的构造函数，怎么去实现单例？” 

特使不屑地说：“忘掉你那套Java思维吧，在Python中想写个singleton有很多办法，我给你展示一个比较Python的方式，用module的方式来实现。”


        #singleton.py
        
        class Singleton:
            def __init__(self):
                self.name = "i'm singleton"
        
        instance = Singleton()
        
        del Singleton  # 把构造函数删除
        
        
        使用Singleton:
        
        
        
        import singleton
        
        print(singleton.instance.name)  # i'm singleton
        
        instance = Singleton() # NameError: name 'Singleton' is not defined


吉森确实没有想到这种写法，利用Python的module来实现信息的隐藏。

Visitor模式

不是每个设计模式都能这么干吧？  吉森心中暗想，他脑海中浮现了一个难于理解的模式：Visitor，自己当初为了学习它可是下了苦工。 

吉森说：“那你说说，对于Visitor，怎么利用Python的特色？” 

“我知道你心里想的是什么，无非就是想让我写一个类，然后在写个Visitor对它进行访问，是不是？” 

        class TreeNode:
            def __init__(self, data):
                self.data = data
                self.left = None
                self.right = None
            def accept(self, visitor):
                if self.left is not None:
                    self.left.accept(visitor)
        
                visitor.visit(self)
        
                if self.right is not None:
                    self.right.accept(visitor)
        
        class PrintVisitor:
            def visit(self,node):
                print(node.data)
        
        root = TreeNode('1')
        root.left = TreeNode('2')
        root.right = TreeNode('3')
        
        visitor = PrintVisitor()
        
        root.accept(visitor)   #输出2, 1, 3


吉森说：“是啊， 难道Visitor模式不是这么写的吗？ ”

"我就说你的Python只是学了点皮毛吧，Visitor的本质是在分离结构和操作， 在Python中使用generator可以更加优雅地实现。” 


        class TreeNode:
        
            def __iter__(self):
                return self.__generator()
        
            def __generator(self):
                if self.left is not None:
                    yield from iter(self.left) 
                yield from self.data
        
                if self.right is not None:
                    yield from iter(self.right) 
        
        root = TreeNode('1')
        root.left = TreeNode('2')
        root.right = TreeNode('3')
        
        for ele in root:
            print(ele)


不得不承认，这种方式使用起来更加简洁，同时达到了结构和操作进行分离的目的。 

特使说道： “看到了吧，Python在语言层面对一些模式提供了支持，所以很多设计模式在我大Python看起来非常笨拙，我们这里并不提倡，当然我们还是要掌握面向对象设计的原则SOLID和设计模式的思想，发现变化并且封装变化，这样才能写出优雅的程序出来。” 

吉森叹了一口气，感慨自己学艺不精，不再反抗，束手就擒。
