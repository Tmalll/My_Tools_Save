Ubuntu、Ollama、Qwen2、Python安装方法不再讲解，自行看前期教程，只不过将安装模型的最后一步改为如下代码：

手把手包教包会！Ubuntu环境下轻松搞定Ollama大模型安装与运行

图片

# 安装Qwen2 7B参数模型
ollama run qwen2
软件、硬件配置
我的软件配置：Win11 + WSL2 + Ubuntu + Ollama + Qwen2：7B + Python 3.12.3

我的硬件配置（无独显，请忽略我的配置，只是告诉大家，这么低就可以运行）：

图片



CPU：12th i5 - 12500

内存：16G

SSD硬盘：500G

详细安装教程
步骤 1: 准备环境
图片



首先确保本地 Python与 Visual Studio Code（我一直在使用的IDE）环境正常，然后安装所有必需的库，可以通过以下命令安装 langchain_community 和 langchain_core：

# 理论上安装langchain后，langchain_community和langchain_core会自动一并安装
pip install langchain
pip install langchain_community
pip install langchain_core
步骤 2: 启动Ollama服务
图片



确保本地 Ubuntu 和 Ollama 服务正在运行，并且已经安装 Qwen2 模型。你可以通过以下命令启动 Ollama 服务：

# 我的已经正常启动，所以提示已经使用中
ollama serve
Error: listen tcp 127.0.0.1:11434: bind: address already in use
浏览器可以访问127.0.0.1:11434地址，显示如下，OK。

图片



步骤 3: 编写代码
1.导入必要的库：

# 导入必要的库
from langchain_community.llms import Ollama  # 导入Ollama模型类
from langchain.callbacks.manager import CallbackManager  # 导入回调管理器
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler  # 导入流式输出处理程序
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate  # 导入提示模板类
2.定义初始化模型的函数：

# 定义初始化Ollama模型的函数
def initialize_ollama_model(model_name: str, temperature: float = 0.1, top_p: float = 0.4):
    """
    初始化Ollama模型实例。
    
    :param model_name: 模型的名称
    :param temperature: 控制生成文本的随机性（默认为0.1）
    :param top_p: 核采样阈值（默认为0.4）
    :return: Ollama模型实例
    """
    # 创建Ollama实例，并指定模型名、温度参数、top_p参数以及一个包含流式输出处理器的回调管理器
    return Ollama(
        model=model_name,  # 指定模型名
        temperature=temperature,  # 设置温度参数
        top_p=top_p,  # 设置top_p参数
        callback_manager=CallbackManager([StreamingStdOutCallbackHandler()])  # 设置回调管理器，包含流式输出处理器
    )
3.定义创建提示模板的函数：

# 定义创建ChatPromptTemplate对象的函数
def create_chat_prompt_template(system_message: str):
    """
    创建一个ChatPromptTemplate对象。
    
    :param system_message: 系统角色的消息，定义模型的角色和行为
    :return: ChatPromptTemplate对象
    """
    # 创建一个ChatPromptTemplate对象，其中包含系统消息和用户输入的占位符
    return ChatPromptTemplate.from_messages([
        ("system", system_message),  # 系统消息
        ("user", "{input}")  # 用户输入的占位符
    ])
4.主函数：

# 主函数
def main():
    # 初始化Ollama模型
    llm = initialize_ollama_model("qwen2")  # 使用"qwen2"作为模型名
    
    # 定义系统消息
    system_message = "你是ucjmhfeng的智能小助手，请使用简体中文回答我。"
    
    # 创建ChatPromptTemplate对象
    prompt = create_chat_prompt_template(system_message)
    
    # 构建处理链
    chain = prompt | llm  # 创建处理链，将提示与模型连接起来
    
    # 用户提问
    user_question = "你是谁？告诉我天为什么是蓝的？"
    
    # 调用处理链并获取结果
    result = chain.invoke({"input": user_question})
    
    # 打印结果
    print(result)
5.执行主函数：

# 如果这个脚本被直接运行，则执行主函数
if __name__ == "__main__":
    main()
步骤 4: 运行代码
运行脚本，这将初始化模型、创建提示模板、构建处理链，并最终调用处理链来获取答案，结果将通过
StreamingStdOutCallbackHandler 实时输出。

总结
这段代码的功能如下：

导入所需的模块：Ollama 用于语言模型，CallbackManager 和 StreamingStdOutCallbackHandler 用于处理输出流，ChatPromptTemplate 用于创建聊天提示模板。

定义了一个函数 initialize_ollama_model 来初始化 Ollama 模型实例，并设置温度和核采样阈值等参数。

定义了另一个函数 create_chat_prompt_template 来创建 ChatPromptTemplate 对象，该对象包含一个系统消息和一个用户输入的占位符。

在 main 函数中，初始化 Ollama 模型，定义系统消息，创建 ChatPromptTemplate，然后将它们组合成一个处理链 (chain)。

用户提出问题，通过调用处理链 (chain) 并传入用户的问题来获取答案，并打印结果。

如果脚本是直接运行的（而不是被导入），则执行 main 函数。

完整代码：

# 导入必要的模块
from langchain_community.llms import Ollama  # 从LangChain社区包导入Ollama模型
from langchain.callbacks.manager import CallbackManager  # 导入用于管理回调的CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler  # 导入用于流式输出到标准输出的处理器
from langchain_core.prompts import ChatPromptTemplate  # 导入用于创建聊天提示的ChatPromptTemplate

# 定义初始化Ollama模型的函数
def initialize_ollama_model(model_name: str, temperature: float = 0.1, top_p: float = 0.4):
    """
    初始化Ollama模型实例。
    
    :param model_name: 模型的名称
    :param temperature: 控制生成文本的随机性（默认为0.1）
    :param top_p: 核采样阈值（默认为0.4）
    :return: Ollama模型实例
    """
    # 创建Ollama实例，并指定模型名、温度参数、top_p参数以及一个包含流式输出处理器的回调管理器
    return Ollama(
        model=model_name,  # 指定模型名
        temperature=temperature,  # 设置温度参数
        top_p=top_p,  # 设置top_p参数
        callback_manager=CallbackManager([StreamingStdOutCallbackHandler()])  # 设置回调管理器，包含流式输出处理器
    )

# 定义创建ChatPromptTemplate对象的函数
def create_chat_prompt_template(system_message: str):
    """
    创建一个ChatPromptTemplate对象。
    
    :param system_message: 系统角色的消息，定义模型的角色和行为
    :return: ChatPromptTemplate对象
    """
    # 创建一个ChatPromptTemplate对象，其中包含系统消息和用户输入的占位符
    return ChatPromptTemplate.from_messages([
        ("system", system_message),  # 系统消息
        ("user", "{input}")  # 用户输入的占位符
    ])

# 主函数
def main():
    # 初始化Ollama模型
    llm = initialize_ollama_model("qwen2")  # 使用"qwen2"作为模型名
    
    # 定义系统消息
    system_message = "你是ucjmhfeng的智能小助手，请使用简体中文回答我。"
    
    # 创建ChatPromptTemplate对象
    prompt = create_chat_prompt_template(system_message)
    
    # 构建处理链
    chain = prompt | llm  # 创建处理链，将提示与模型连接起来
    
    # 用户提问
    user_question = "你是谁？告诉我天为什么是蓝的？"
    
    # 调用处理链并获取结果
    result = chain.invoke({"input": user_question})
    
    # 打印结果
    print(result)

# 如果这个脚本被直接运行，则执行主函数
if __name__ == "__main__":
    main()
运行结果如下：

~$ /home/user/ai/bin/python /home/user/python/ai_test.py
我是ucjmhfeng的智能小助手，专门用来提供帮助和解答问题。关于天空为什么是蓝色的问题，其实涉及到光的散射原理。

当太阳光线进入地球大气层时，会遇到空气分子、水蒸气、尘埃等微粒。这些微粒对不同颜色的光有不同的散射能力。蓝光波长较短，能量较高，在与空气分子碰撞时更容易发生散射现象，并且在各个方向上都能被广泛地散开。因此，当阳光穿过大气层时，大部分蓝色光线向四面八方散射。

由于地球上的观察者（包括我们人类）通常处于地面位置，视线主要朝向天空。所以当我们抬头望天时，看到的主要是经过大气层散射后的光线。这些散射的蓝光在各个方向上都有，因此我们在白天看到的天空呈现出蓝色。当太阳接近地平线时，光线需要通过更厚的大气层到达我们的眼睛，此时大部分蓝光已经被散射掉，剩下的主要是波长较长、颜色较红的光线，所以日出和日落时天空会呈现红色或橙色。

这就是为什么天空在白天是蓝色的原因。我是ucjmhfeng的智能小助手，专门用来提供帮助和解答问题。关于天空为什么是蓝色的问题，其实涉及到光的散射原理。

当太阳光线进入地球大气层时，会遇到空气分子、水蒸气、尘埃等微粒。这些微粒对不同颜色的光有不同的散射能力。蓝光波长较短，能量较高，在与空气分子碰撞时更容易发生散射现象，并且在各个方向上都能被广泛地散开。因此，当阳光穿过大气层时，大部分蓝色光线向四面八方散射。

由于地球上的观察者（包括我们人类）通常处于地面位置，视线主要朝向天空。所以当我们抬头望天时，看到的主要是经过大气层散射后的光线。这些散射的蓝光在各个方向上都有，因此我们在白天看到的天空呈现出蓝色。当太阳接近地平线时，光线需要通过更厚的大气层到达我们的眼睛，此时大部分蓝光已经被散射掉，剩下的主要是波长较长、颜色较红的光线，所以日出和日落时天空会呈现红色或橙色。

这就是为什么天空在白天是蓝色的原因。
是不是手把手包教包会？如果有问题，可以随时在评论区留言。
