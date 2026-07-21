Numpy 是 Python 的一个第三方库，就是 Numerical Python 的意思。这是一个科学计算的的核心库，有着强大的多维数组对象
Numpy 数组是一个功能强大的 N 维数组对象，它以行和列的形式存在，我们可以通过 Python 列表来初始化 Numpy 数组并访问其元素
开始使用 Numpy
1 维数组
import numpy as np
a=np.array([1,2,3])
print(a)
Output:
[1 2 3]
多维数组
a=np.array([(1,2,3),(4,5,6)])
print(a)
Output:
[[ 1 2 3]
[4 5 6]]
当然，这里还有一个疑问，我们为啥不直接使用 Python 列表，而要使用 Numpy 的数组呢，下面我们就通过一些例子来看看
Python NumPy Array v/s List
使用 Numpy 数组而不是 Python 列表的原因，这要有以下三点
• 更少的内存
• 更快
• 更加方便
选择 python NumPy 数组的第一个原因是它比列表占用更少的内存， 然后，它在执行方面也非常快，同时使用 NumPy 也是相当方便的。所以这些是 Python NumPy 数组相对于列表的主要优势，下面我们将在下面的例子中一一实践证明以上几点
import numpy as np
import time
import sys
S= range(1000)
print(sys.getsizeof(5)*len(S))
D= np.arange(1000)
print(D.size*D.itemsize)
Output:
28000
4000
上面的输出显示 list 分配的内存（用S表示）是 14000，而 NumPy 数组分配的内存只有 4000。由此可以得出，两者之间存在重大差异，这也使得 Python NumPy 数组 成为代替列表的首选
接下来让我们谈谈和列表相比，Python NumPy 数组为什么更快更方便
import time
import sys
SIZE = 1000000
L1= range(SIZE)
L2= range(SIZE)
A1= np.arange(SIZE)
A2=np.arange(SIZE)
start= time.time()
result=[(x,y) for x,y in zip(L1,L2)]
print((time.time()-start)*1000)
start=time.time()
result= A1+A2
print((time.time()-start)*1000)
Ouput:
156.21376037597656
46.89955711364746
通过上面的代码可以看出，List 花费了 380 毫秒，而 Numpy 数组花费了仅仅 49 毫秒，这绝对是碾压
再观察上面的代码，同样是合并两个列表，对于 List 需要用到 for 循环，而 对于 Numpy 数组则仅仅需要相加处理即可，也可以看出 Numpy 数据方便很多
下面我们来关注 Numpy 的一些操作，这个才是我们学习 Numpy 的重点
Numpy 的相关操作
• ndim
我们可以借助函数 ndim 来获取 Numpy 数组的维数
import numpy as np
a = np.array([(1,2,3),(4,5,6)])
print(a.ndim)
Output:
2
可以看到，上面代码创建的是一个二维数组
• itemsize
用于计算每个元素的字节大小
import numpy as np
a = np.array([(1,2,3)])
print(a.itemsize)
Output:
4
可以看出，每个元素在上面的数组中占据4个字节
• dtype
用于查看元素的数据类型
import numpy as np
a = np.array([(1,2,3)])
print(a.dtype)
Output:
int32
如上，我们看到创建的数据元素类型是32位整数
• size 和 shape
查看数组的大小和形状
import numpy as np
a = np.array([(1,2,3,4,5,6)])
print(a.size)
print(a.shape)
Output:
6 
(1,6)
• reshape
可以理解为改变数组的行列分布，我们来具体看个例子
如上图所示，我们有 3 列 2 行，现在要转换为 2 列 3 行， 让我们来看看要如何完成
import numpy as np
a = np.array([(8,9,10),(11,12,13)])
print(a)
a=a.reshape(3,2)
print(a)
Output:
[[ 8 9 10] [11 12 13]] 
[[ 8 9] [10 11] [12 13]]
• slicing
切片，就是从一个数组当中提取一部分，这与 Python 列表的切片还是很相似的
我们先来看一个简单的， 这里有一个数组，我们需要给定数组中的一个特定元素（比如 3）
import numpy as np
a=np.array([(1,2,3,4),(3,4,5,6)])
print(a[0,2])
Output:
3
在上面的例子中，数组(1,2,3,4) 是索引 0，而(3,4,5,6) 是 Python Numpy 数组的索引 1，因此，我们打印了第零个索引中的第二个元素
我们稍微复杂一些，假设我们需要数组的第零个和第一个索引中的第二个元素
import numpy as np
a=np.array([(1,2,3,4),(3,4,5,6)])
print(a[0:,2])
Output:
[3 5]
这里冒号代表所有行，包括零， 现在要获取第二个元素，我们将从两行中调用索引 2，分别为我们获取值 3 和 5
接下来，为了消除混淆，假设我们还有一行，我们只想打印数组中的前两个索引中的元素， 我们可以这样做
import numpy as np
a=np.array([(8,9),(10,11),(12,13)])
print(a[0:2,1])
Output:
[9 11]
正如上面的代码中展示的，只有 9 和 11 被打印出来了
• linspace
这个函数返回指定间隔内均匀间隔的数字
import numpy as np
a=np.linspace(1,3,10)
print(a)
Output:
[1.         1.22222222 1.44444444 1.66666667 1.88888889 2.11111111
 2.33333333 2.55555556 2.77777778 3.        ]
打印了1到3之间的10个值
• max/ min
获取数组当中的最大最小值
import numpy as np
a= np.array([1,2,3])
print(a.min())
print(a.max())
print(a.sum())
Output:
1 3 6
可以看到上面的操作都是非常基础的，下面我们来做些更大的
axis 轴
这是 Numpy 中相当重要的概念，也是不太容易理解的部分
向上图所示，我们有一个 2*3 的 Numpy 数组， 这里的行称为轴 1，列称为轴 0，现在我们看看这个轴到底有什么用处
假设我们想计算所有列的总和，那么我们就可以使用 axis
a= np.array([(1,2,3),(3,4,5)])
print(a.sum(axis=0))
Output:
[4 6 8]
因此，将所有列的总和相加，其中 1+3=4、2+4=6 和 3+5=8， 同样，如果我们将轴替换为 1，那么它将打印 [6 12]，会把所有行都相加到一起
• Square Root & Standard Deviation
用于执行数学函数，分别是平方根和标准差
import numpy as np
a=np.array([(1,2,3),(3,4,5,)])
print(np.sqrt(a))
print(np.std(a))
Output:
[[ 1. 1.41421356 1.73205081]
[ 1.73205081 2. 2.23606798]]
1.29099444874
就像看到的那样，打印了所有元素的平方根。，此外，还打印了上述数组的标准偏差，即每个元素与 Python Numpy 数组的平均值相差多少
• Addition Operation
我们还可以进行 Numpy 数组的加减乘除等操作
import numpy as np
x= np.array([(1,2,3),(3,4,5)])
y= np.array([(1,2,3),(3,4,5)])
print(x+y)
Output:
[[ 2 4 6] [ 6 8 10]]
下面来看看减法、乘法和除法
import numpy as np
x= np.array([(1,2,3),(3,4,5)])
y= np.array([(1,2,3),(3,4,5)])
print(x-y)
print(x*y)
print(x/y)
Output:
[[0 0 0] [0 0 0]]
[[ 1 4 9] [ 9 16 25]]
[[ 1. 1. 1.] [ 1. 1. 1.]]
• Vertical & Horizontal Stacking
还可以对数组进行垂直叠加和水平叠加
import numpy as np
x= np.array([(1,2,3),(3,4,5)])
y= np.array([(1,2,3),(3,4,5)])
print(np.vstack((x,y)))
print(np.hstack((x,y)))
Output:
[[1 2 3] [3 4 5] [1 2 3] [3 4 5]]
[[1 2 3 1 2 3] [3 4 5 3 4 5]]
• ravel
这个函数可以把数组转换为单列
import numpy as np
x= np.array([(1,2,3),(3,4,5)])
print(x.ravel())
Output:
[ 1 2 3 3 4 5]
下面我们再来看一些 Numpy 的特殊方法吧
Numpy 特殊方法
Numpy 有各种各样的特殊函数可用，例如 sine, cosine, tan, log 等。首先，让我们从 sine （正弦函数）开始，下面用到的模块 Matplotlib 我们会在下面介绍
import numpy as np
import matplotlib.pyplot as plt
x= np.arange(0,3*np.pi,0.1)
y=np.sin(x)
plt.plot(x,y)
plt.show()
同样的我们还可以绘制其他的三角函数图形，比如 tan
import numpy as np
import matplotlib.pyplot as plt
x= np.arange(0,3*np.pi,0.1)
y=np.tan(x)
plt.plot(x,y)
plt.show()
接下来我们再看看 Numpy 数组中的其他一些特殊功能，例如指数和对数函数。
a= np.array([1,2,3])
print(np.exp(a))
Output:
[ 2.71828183   7.3890561   20.08553692]
可以看到，指数值被打印出来，即 e 的 1 次方是 e，结果是 2.718…… 同样的，e 的 2 次方给出了接近 7.38 的值，依此类推
接下来，计算 log
import numpy as np
import matplotlib.pyplot as plt
a= np.array([1,2,3])
print(np.log(a))
Output:
[ 0.          0.69314718  1.09861229]
我们计算了自然对数，它给出了如上所示的值。现在，如果我们想要 log base 10 而不是 Ln 或自然对数，可以参照如下代码：
import numpy as np
import matplotlib.pyplot as plt
a= np.array([1,2,3])
print(np.log10(a))
Output:
[ 0.        0.30103      0.47712125]
至此，我们就完成了 Numpy 数据的基本入门，下面就是 Pandas 了
Pandas
Pandas 是什么就不过多介绍了，咱们直接进入主题，来看看 Pandas 的常用操作
• Slicing the Data Frame
进行切片，我们先来创建一个 DataFrame 数据
import pandas as pd
XYZ_web= {'Day':[1,2,3,4,5,6], "Visitors":[1000, 700,6000,1000,400,350], "Bounce_Rate":[20,20, 23,15,10,34]}
df= pd.DataFrame(XYZ_web)
print(df)
Output:
Bounce_Rate Day Visitors
0     20          1   1000
1     20          2   700
2     23          3   6000
3     15          4   1000
4     10          5   400
5     34          6   350
下面我们来获取指定的数据
print(df.head(2))
Output:
Bounce_Rate Day Visitors
0      20         1   1000
1      20         2    700
类似的，还可以获取最后两行数据
print(df.tail(2))
Output:
Bounce_Rate Day Visitors 
4      10      5    400
5      34      6    350
• Merging & Joining
在合并中，我们可以合并两个 DataFrame 以形成单个 DataFrame
让我们实际实现一下，首先我们将创建三个 DataFrame，其中包含一些键值对，然后将这些 DataFrame 合并在一起
import pandas as pd
df1= pd.DataFrame({ "HPI":[80,90,70,60],"Int_Rate":[2,1,2,3],"IND_GDP":[50,45,45,67]}, index=[2001, 2002,2003,2004])
df2=pd.DataFrame({ "HPI":[80,90,70,60],"Int_Rate":[2,1,2,3],"IND_GDP":[50,45,45,67]}, index=[2005, 2006,2007,2008])
merged= pd.merge(df1,df2)
print(merged)
Output：
HPI   IND_GDP Int_Rate
0  80      50      2
1  90      45      1
2  70      45      2
3  60      67      3
当然我们还可以指定列来合并
df1 = pd.DataFrame({"HPI":[80,90,70,60],"Int_Rate":[2,1,2,3], "IND_GDP":[50,45,45,67]}, index=[2001, 2002,2003,2004])
df2 = pd.DataFrame({"HPI":[80,90,70,60],"Int_Rate":[2,1,2,3],"IND_GDP":[50,45,45,67]}, index=[2005, 2006,2007,2008])
merged= pd.merge(df1,df2,on ="HPI")
print(merged)
Output:
IND_GDP  Int_Rate  Low_Tier_HPI  Unemployment
2001     50      2         50.0            1.0
2002     45      1         NaN             NaN
2003     45      2         45.0            3.0
2004     67      3         67.0            5.0
2004     67      3         34.0            6.0
下面再来看看 join 操作，连接操作将在“索引”而不是“列”上进行
df1 = pd.DataFrame({"Int_Rate":[2,1,2,3], "IND_GDP":[50,45,45,67]}, index=[2001, 2002,2003,2004])
df2 = pd.DataFrame({"Low_Tier_HPI":[50,45,67,34],"Unemployment":[1,3,5,6]}, index=[2001, 2003,2004,2004])
joined= df1.join(df2)
print(joined)
Output:
IND_GDP  Int_Rate Low_Tier_HPI  Unemployment
2001     50       2         50.0           1.0
2002     45       1         NaN            NaN
2003     45       2         45.0           3.0
2004     67       3         67.0           5.0
2004     67       3         34.0           6.0
在 2002 年（索引），列“low_tier_HPI”和“unemployment”没有附加值，因此它打印了 NaN（非数字），2004 年晚些时候，这两个值都可用，所以它打印了各自的值
• Concatenation
Concatenation 是将 DataFrame 粘合在一起的操作， 我们可以选择要串联的维度。为此，只需使用“pd.concat”并传入 DataFrame 列表以连接在一起
df1 = pd.DataFrame({"HPI":[80,90,70,60],"Int_Rate":[2,1,2,3], "IND_GDP":[50,45,45,67]}, index=[2001, 2002,2003,2004])
df2 = pd.DataFrame({"HPI":[80,90,70,60],"Int_Rate":[2,1,2,3],"IND_GDP":[50,45,45,67]}, index=[2005, 2006,2007,2008])
concat= pd.concat([df1,df2])
print(concat)
Output:
HPI  IND_GDP Int_Rate
2001    80    50       2
2002    90    45       1
2003    70    45       2
2004    60    67       3
2005    80    50       2
2006    90    45       1
2007    70    45       2
2008    60    67       3
两个 DataFrame 被粘合在一个 DataFrame 中，其中索引从 2001 年一直到 2008 年。接下来，我们还可以指定 axis=1 以便沿列连接、合并或串联
df1 = pd.DataFrame({"HPI":[80,90,70,60],"Int_Rate":[2,1,2,3], "IND_GDP":[50,45,45,67]}, index=[2001, 2002,2003,2004])
df2 = pd.DataFrame({"HPI":[80,90,70,60],"Int_Rate":[2,1,2,3],"IND_GDP":[50,45,45,67]}, index=[2005, 2006,2007,2008])
concat= pd.concat([df1,df2],axis=1)
print(concat)
Output:
HPI  IND_GDP  Int_Rate HPI  IND_GDP Int_Rate
2001   80.0  50.0       2.0   NaN    NaN     NaN
2002   90.0  45.0       1.0   NaN    NaN     NaN
2003   70.0  45.0       2.0   NaN    NaN     NaN
2004   60.0  67.0       3.0   NaN    NaN     NaN
2005   NaN   NaN        NaN   80.0   50.0    2.0
2006   NaN   NaN        NaN   90.0   45.0    1.0
2007   NaN   NaN        NaN   70.0   45.0    2.0
2008   NaN   NaN        NaN   60.0   67.0    3.0
• Change the index
我们来改变 DataFrame 的索引值
import pandas as pd
df= pd.DataFrame({"Day":[1,2,3,4], "Visitors":[200, 100,230,300], "Bounce_Rate":[20,45,60,10]}) 
df.set_index("Day", inplace= True)
print(df)
Output:
Bounce_Rate  Visitors
Day 
1      20           200
2      45           100
3      60           230
4      10           300
• Change the Column Headers
我们来改变列标题
import pandas as pd
df = pd.DataFrame({"Day":[1,2,3,4], "Visitors":[200, 100,230,300], "Bounce_Rate":[20,45,60,10]})
df = df.rename(columns={"Visitors":"Users"})
print(df)
Output:
Bounce_Rate  Day  Users
0    20         1    200
1    45         2    100
2    60         3    230
3    10         4    300
数据格式转换
import pandas as pd
country= pd.read_csv("D:UsersAayushiDownloadsworld-bank-youth-unemploymentAPI_ILO_country_YU.csv",index_col=0)
country.to_html('edu.html')
运行此代码后，将创建一个名为“edu.html”的 HTML 文件
Output:
下面我们通过一个数据集来实战一下
有一个包含 2010 年到 2014 年全球失业青年百分比的数据集，我们使用这个数据集，找出 2010 年到 2011 年每个国家青年百分比的变化
首先，让我们了解包含国家名称、国家代码和年份从 2010 年到 2014 年的数据集。现在使用 Pandas，用“pd.read_csv”读取 .csv 文件格式文件
让我们继续进行数据分析，我们将找出 2010 年至 2011 年失业青年的百分比变化。然后我们用 Matplotlib 库对其进行可视化
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib import style
style.use('fivethirtyeight')
country= pd.read_csv("D:UsersAayushiDownloadsworld-bank-youth-unemploymentAPI_ILO_country_YU.csv",index_col=0)
df= country.head(5)
df= df.set_index(["Country Code"])
sd = sd.reindex(columns=['2010','2011'])
db= sd.diff(axis=1)
db.plot(kind="bar")
plt.show()
通过上图可以看出，在 2010 年至 2011 年期间，阿富汗 (AFG) 的失业青年人数增加了约 0.25%。在安哥拉（AGO），是一个负增长趋势，这意味着失业青年的百分比已经下降了
至此，我们的 Pandas 入门就到这里，下面进行 Matplotlib 的学习吧
Matplotlib
Matplotlib 支持多种图表的绘制
我们先来看看如何生成一个基本图形
from matplotlib import pyplot as plt
 #Plotting to our canvas
 plt.plot([1,2,3],[4,5,1])
 #Showing what we plotted
 plt.show()
Output:
可以看到，仅仅三行代码，就生成了一个基本图形，还是非常简单的
下面我们再为图表增加标题等信息
from matplotlib import pyplot as plt
x = [5,2,7]
y = [2,16,4]
plt.plot(x,y)
plt.title('Info')
plt.ylabel('Y axis')
plt.xlabel('X axis')
plt.show()
Output:
接下来我们尝试为图表增加更多的样式
from matplotlib import pyplot as plt
from matplotlib import style
style.use('ggplot')
x = [5,8,10]
y = [12,16,6]
x2 = [6,9,11]
y2 = [6,15,7]
plt.plot(x,y,'g',label='line one', linewidth=5)
plt.plot(x2,y2,'c',label='line two',linewidth=5)
plt.title('Epic Info')
plt.ylabel('Y axis')
plt.xlabel('X axis')
plt.legend()
plt.grid(True,color='k')
plt.show()
Output:
下面我们开始绘制不同种类的图形
• Bar Graph
首先，让我们先明确什么时候需要条形图。条形图使用条形来比较不同类别之间的数据，当我们想测量一段时间内的变化时，使用条形图表示就非常适合。
from matplotlib import pyplot as plt
plt.bar([0.25,1.25,2.25,3.25,4.25],[50,40,70,80,20],
label="BMW",width=.5)
plt.bar([.75,1.75,2.75,3.75,4.75],[80,20,20,50,60],
label="Audi", color='r',width=.5)
plt.legend()
plt.xlabel('Days')
plt.ylabel('Distance (kms)')
plt.title('Information')
plt.show()
Output:
• Histogram
我们先来看下条形图和直方图之间的区别。直方图用于显示分布，而条形图用于比较不同的实体。当我们有数组或很长的列表时，直方图就很有用。
让我们考虑一个例子，当我们必须根据 bin 绘制人口年龄。现在，bin 指的是划分为一系列区间的值范围，通常创建的 bin 大小相同，在下面的代码中，我以 10 的间隔创建了 bin，这就说明第一个 bin 包含从 0 到 9 的元素，然后是 10 到 19，依此类推。
import matplotlib.pyplot as plt
population_age = [22,55,62,45,21,22,34,42,42,4,2,102,95,85,55,110,120,70,65,55,111,115,80,75,65,54,44,43,42,48]
bins = [0,10,20,30,40,50,60,70,80,90,100]
plt.hist(population_age, bins, histtype='bar', rwidth=0.8)
plt.xlabel('age groups')
plt.ylabel('Number of people')
plt.title('Histogram')
plt.show()
Output:
在上图中所看到的，我们得到了与 bin 相关的年龄组，最大的年龄组在 40 到 50 岁之间
• Scatter Plot
通常我们需要散点图来比较变量，例如，一个变量受另一个变量影响的程度以从中建立一定关系。数据显示为一组点，每个点都有一个变量的值，它决定了水平轴上的位置，另一个变量的值决定了垂直轴上的位置
import matplotlib.pyplot as plt
x = [1,1.5,2,2.5,3,3.5,3.6]
y = [7.5,8,8.5,9,9.5,10,10.5]
x1=[8,8.5,9,9.5,10,10.5,11]
y1=[3,3.5,3.7,4,4.5,5,5.2]
plt.scatter(x,y, label='high income low saving',color='r')
plt.scatter(x1,y1,label='low income high savings',color='b')
plt.xlabel('saving*100')
plt.ylabel('income*1000')
plt.title('Scatter Plot')
plt.legend()
plt.show()
Output:
• Area Plot
面积图与线图非常相似，它们也称为堆栈图。这些图可用于跟踪构成一个完整类别的两个或多个相关组随时间的变化。例如，让我们将一天中完成的工作归为类别，比如睡觉、吃饭、工作和玩耍
import matplotlib.pyplot as plt
days = [1,2,3,4,5]
 sleeping =[7,8,6,11,7]
 eating = [2,3,4,3,2]
 working =[7,8,7,2,2]
 playing = [8,5,7,8,13]
 plt.plot([],[],color='m', label='Sleeping', linewidth=5)
 plt.plot([],[],color='c', label='Eating', linewidth=5)
 plt.plot([],[],color='r', label='Working', linewidth=5)
 plt.plot([],[],color='k', label='Playing', linewidth=5)
 plt.stackplot(days, sleeping,eating,working,playing, colors=['m','c','r','k'])
 plt.xlabel('x')
 plt.ylabel('y')
 plt.title('Stack Plot')
 plt.legend()
 plt.show()
Output:
• Pie Chart
饼图是指一个圆形图，它被分解成段，即饼图。它基本上用于显示百分比或比例数据，其中每个饼图代表一个类别
import matplotlib.pyplot as plt
days = [1,2,3,4,5]
sleeping =[7,8,6,11,7]
eating = [2,3,4,3,2]
working =[7,8,7,2,2]
playing = [8,5,7,8,13]
slices = [7,2,2,13]
activities = ['sleeping','eating','working','playing']
cols = ['c','m','r','b']
plt.pie(slices,
  labels=activities,
  colors=cols,
  startangle=90,
  shadow= True,
  explode=(0,0.1,0,0),
  autopct='%1.1f%%')
plt.title('Pie Plot')
plt.show()
Output:
• Working With Multiple Plots
我们现在开始绘制多个图形，使用 Numpy 进行辅助
import numpy as np
import matplotlib.pyplot as plt
def f(t):
    return np.exp(-t) * np.cos(2*np.pi*t)
t1 = np.arange(0.0, 5.0, 0.1)
t2 = np.arange(0.0, 5.0, 0.02)
plt.subplot(221)
plt.plot(t1, f(t1), 'bo', t2, f(t2))
plt.subplot(222)
plt.plot(t2, np.cos(2*np.pi*t2))
plt.show()
Output:
这里有一个新概念，即子图。subplot() 函数指定范围从 1 到 numrowsnumcols 的 numrow、numcol、fignum。如果 numrowsnumcols<10，则此函数中的逗号是可选的。因此子图 (221) 与子图 (2,2,1) 相同
子图可以帮助我们绘制多个图形，我们可以在其中通过垂直或水平对齐来定义
上面就是 Matplotlib 的基本入门知识了
