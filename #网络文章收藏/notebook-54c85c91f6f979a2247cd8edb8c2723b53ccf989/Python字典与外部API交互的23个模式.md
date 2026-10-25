大家好！今天我们要聊的是如何使用Python字典与外部API进行交互。API（Application Programming Interface）是应用程序之间通信的接口，而Python字典是一种非常灵活的数据结构，非常适合处理API返回的数据。我们将从简单的概念开始，逐步深入到更高级的技术，帮助你更好地理解和掌握这些技能。

1. 发送GET请求并解析JSON响应
首先，我们来看看如何发送GET请求并解析JSON响应。我们将使用requests库来发送请求，并将响应解析为字典。

import requests

# 发送GET请求
response = requests.get('https://api.example.com/data')

# 检查请求是否成功
if response.status_code == 200:
    # 将响应解析为字典
    data = response.json()
    print(data)
else:
    print(f"请求失败，状态码: {response.status_code}")
解释：

requests.get发送GET请求。
response.status_code检查HTTP状态码，200表示成功。
response.json()将响应体解析为字典。
2. 处理嵌套字典
API返回的数据往往包含嵌套字典。我们需要学会如何访问嵌套数据。

data = {
    "user": {
        "name": "Alice",
        "age": 30,
        "address": {
            "street": "123 Main St",
            "city": "New York"
        }
    }
}

# 访问嵌套数据
user_name = data['user']['name']
user_city = data['user']['address']['city']

print(f"用户姓名: {user_name}, 城市: {user_city}")
解释：

使用多重索引访问嵌套字典中的值。
3. 遍历字典
有时候我们需要遍历字典中的所有键值对。可以使用for循环来实现。

data = {
    "name": "Alice",
    "age": 30,
    "city": "New York"
}

# 遍历字典
for key, value in data.items():
    print(f"{key}: {value}")
解释：

data.items()返回一个包含键值对的列表。
for循环遍历每个键值对。
4. 处理列表中的字典
API返回的数据中可能包含列表，列表中的每个元素都是一个字典。我们需要学会如何处理这种情况。

data = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25}
]

# 遍历列表中的字典
for user in data:
    print(f"姓名: {user['name']}, 年龄: {user['age']}")
解释：

for循环遍历列表中的每个字典。
5. 添加和修改字典项
我们可以使用字典的update方法或直接赋值来添加和修改字典项。

data = {
    "name": "Alice",
    "age": 30
}

# 添加新项
data['email'] = 'alice@example.com'

# 修改现有项
data.update({"age": 31})

print(data)
解释：

data['email'] = 'alice@example.com'添加新项。
data.update({"age": 31})修改现有项。
6. 删除字典项
使用del关键字或pop方法可以删除字典中的项。

data = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com"
}

# 删除项
del data['email']
age = data.pop('age')

print(data)
print(f"删除的年龄: {age}")
解释：

del data['email']删除指定键的项。
data.pop('age')删除并返回指定键的值。
7. 检查字典中是否存在键
使用in关键字可以检查字典中是否存在某个键。

data = {
    "name": "Alice",
    "age": 30
}

# 检查键是否存在
if 'email' in data:
    print("存在email")
else:
    print("不存在email")

if 'name' in data:
    print("存在name")
解释：

if 'email' in data检查字典中是否存在email键。
8. 获取字典的长度
使用len函数可以获取字典的长度。

data = {
    "name": "Alice",
    "age": 30
}

# 获取字典长度
length = len(data)
print(f"字典长度: {length}")
解释：

len(data)返回字典中键值对的数量。
9. 获取字典的所有键和值
使用keys和values方法可以分别获取字典的所有键和值。

data = {
    "name": "Alice",
    "age": 30
}

# 获取所有键
keys = data.keys()
print(f"所有键: {list(keys)}")

# 获取所有值
values = data.values()
print(f"所有值: {list(values)}")
解释：

data.keys()返回所有键的视图。
data.values()返回所有值的视图。
10. 使用字典推导式
字典推导式是一种简洁的方式来创建字典。

data = ["Alice", "Bob", "Charlie"]

# 字典推导式
user_dict = {name: len(name) for name in data}

print(user_dict)
解释：

{name: len(name) for name in data}创建一个新的字典，键为名字，值为名字的长度。
11. 处理API错误和异常
在与API交互时，可能会遇到各种错误和异常。我们需要学会如何处理这些情况。

import requests

try:
    response = requests.get('https://api.example.com/data')
    response.raise_for_status()  # 如果响应状态码不是200，抛出HTTPError
    data = response.json()
    print(data)
except requests.exceptions.HTTPError as errh:
    print(f"HTTP Error: {errh}")
except requests.exceptions.ConnectionError as errc:
    print(f"Error Connecting: {errc}")
except requests.exceptions.Timeout as errt:
    print(f"Timeout Error: {errt}")
except requests.exceptions.RequestException as err:
    print(f"Something went wrong: {err}")
解释：

response.raise_for_status()检查响应状态码，如果不是200，抛出HTTPError。
使用try-except块捕获并处理各种异常。
12. 使用环境变量存储API密钥
为了安全起见，我们通常不希望将API密钥硬编码在代码中。可以使用环境变量来存储API密钥。

import os
import requests

# 获取环境变量
api_key = os.getenv('API_KEY')

# 发送请求
response = requests.get(f'https://api.example.com/data?api_key={api_key}')
data = response.json()
print(data)
解释：

os.getenv('API_KEY')获取环境变量API_KEY的值。
13. 处理分页数据
许多API返回的数据是分页的。我们需要学会如何处理分页数据。

import requests

def fetch_data(page):
    response = requests.get(f'https://api.example.com/data?page={page}')
    return response.json()

# 获取第一页数据
data = fetch_data(1)

# 检查是否有更多页面
while 'next_page' in data and data['next_page']:
    next_page = data['next_page']
    data = fetch_data(next_page)
    print(data)
解释：

fetch_data(page)函数发送请求并返回指定页面的数据。
使用while循环检查是否有更多页面，并继续获取数据。
14. 使用会话管理器
requests库提供了会话管理器，可以提高与API交互的效率。

import requests

# 创建会话
session = requests.Session()

# 发送多个请求
response1 = session.get('https://api.example.com/data1')
response2 = session.get('https://api.example.com/data2')

data1 = response1.json()
data2 = response2.json()

print(data1)
print(data2)
解释：

requests.Session()创建一个会话对象。
使用会话对象发送多个请求，会话对象会自动管理连接池。
15. 处理API认证
许多API需要认证才能访问。我们可以使用requests库提供的认证机制。

import requests
from requests.auth import HTTPBasicAuth

# 发送带有基本认证的请求
response = requests.get('https://api.example.com/data', auth=HTTPBasicAuth('username', 'password'))

data = response.json()
print(data)
解释：

HTTPBasicAuth('username', 'password')创建基本认证对象。
auth参数传递认证对象。
16. 使用异步请求
对于需要高并发的场景，可以使用aiohttp库发送异步请求。

import aiohttp
import asyncio

async def fetch_data(session, url):
    async with session.get(url) as response:
        return await response.json()

async def main():
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_data(session, 'https://api.example.com/data1'),
            fetch_data(session, 'https://api.example.com/data2')
        ]
        results = await asyncio.gather(*tasks)
        for result in results:
            print(result)

# 运行异步主函数
asyncio.run(main())
************************************************### Python字典与外部API交互的16个模式（续）

在上一部分中，我们介绍了如何使用Python字典与外部API进行基本的交互，包括发送GET请求、处理嵌套字典、遍历字典、添加和修改字典项等。现在，我们将继续深入探讨更高级的概念和技术。

17. 使用POST请求发送数据
有时候我们需要向API发送数据，这通常通过POST请求来实现。我们可以使用requests库的post方法来发送POST请求。

import requests

# 定义要发送的数据
data = {
    "name": "Alice",
    "age": 30
}

# 发送POST请求
response = requests.post('https://api.example.com/create_user', json=data)

# 检查请求是否成功
if response.status_code == 201:
    print("用户创建成功")
    created_user = response.json()
    print(created_user)
else:
    print(f"请求失败，状态码: {response.status_code}")
解释：

requests.post发送POST请求。
json=data将字典转换为JSON格式并发送。
response.json()解析响应体为字典。
18. 处理复杂的API响应
有些API返回的响应可能非常复杂，包含多个嵌套层级。我们需要学会如何处理这些复杂的响应。

import requests

# 发送GET请求
response = requests.get('https://api.example.com/complex_data')

# 检查请求是否成功
if response.status_code == 200:
    data = response.json()
    
    # 处理嵌套数据
    users = data['users']
    for user in users:
        name = user['name']
        address = user['address']
        city = address['city']
        print(f"姓名: {name}, 城市: {city}")
else:
    print(f"请求失败，状态码: {response.status_code}")
解释：

data['users']访问嵌套的用户列表。
user['address']['city']访问嵌套的地址信息。
19. 使用类封装API交互
为了提高代码的可维护性和复用性，可以使用类来封装API交互逻辑。

import requests

class APIClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
    
    def get(self, endpoint):
        url = f"{self.base_url}/{endpoint}?api_key={self.api_key}"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()
    
    def post(self, endpoint, data):
        url = f"{self.base_url}/{endpoint}?api_key={self.api_key}"
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

# 使用API客户端
client = APIClient('https://api.example.com', os.getenv('API_KEY'))

# 获取数据
data = client.get('data')
print(data)

# 发送数据
response = client.post('create_user', {'name': 'Alice', 'age': 30})
print(response)
解释：

APIClient类封装了API交互逻辑。
__init__方法初始化API客户端。
get和post方法分别发送GET和POST请求。
20. 使用缓存优化性能
频繁请求API可能会导致性能问题，可以使用缓存来优化性能。我们可以使用requests_cache库来实现缓存。

import requests_cache
import requests

# 启用缓存
requests_cache.install_cache('api_cache', backend='sqlite', expire_after=3600)

# 发送请求
response = requests.get('https://api.example.com/data')

# 检查请求是否成功
if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print(f"请求失败，状态码: {response.status_code}")
解释：

requests_cache.install_cache启用缓存，指定缓存后端和过期时间。
缓存会在第一次请求时存储数据，后续请求会直接从缓存中读取。
21. 使用OAuth2进行认证
许多现代API使用OAuth2进行认证。我们可以使用requests-oauthlib库来处理OAuth2认证。

from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient
import os

# 定义客户端ID和密钥
client_id = os.getenv('CLIENT_ID')
client_secret = os.getenv('CLIENT_SECRET')

# 创建OAuth2客户端
client = BackendApplicationClient(client_id=client_id)
oauth = OAuth2Session(client=client)

# 获取访问令牌
token = oauth.fetch_token(token_url='https://api.example.com/oauth/token', client_id=client_id, client_secret=client_secret)

# 发送请求
response = oauth.get('https://api.example.com/data')

# 检查请求是否成功
if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print(f"请求失败，状态码: {response.status_code}")
解释：

BackendApplicationClient创建OAuth2客户端。
oauth.fetch_token获取访问令牌。
使用oauth.get发送带有访问令牌的请求。
22. 处理API限流
许多API有请求频率限制，我们需要学会如何处理这些限制。可以使用time.sleep来控制请求频率。

import requests
import time

# 定义请求间隔时间
request_interval = 1  # 每秒最多发送一次请求

def fetch_data(page):
    response = requests.get(f'https://api.example.com/data?page={page}')
    return response.json()

# 获取第一页数据
data = fetch_data(1)

# 检查是否有更多页面
while 'next_page' in data and data['next_page']:
    next_page = data['next_page']
    time.sleep(request_interval)  # 控制请求频率
    data = fetch_data(next_page)
    print(data)
解释：

time.sleep(request_interval)控制每次请求之间的间隔时间。
23. 使用Web框架集成API
在Web应用中，我们经常需要集成API。可以使用Flask框架来实现。

from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/get_weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    api_key = os.getenv('WEATHER_API_KEY')
    url = f'https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric'
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if data['cod'] == 200:
            weather = data['weather'][0]['description']
            temperature = data['main']['temp']
            return jsonify({
                "city": city,
                "weather": weather,
                "temperature": temperature
            })
        else:
            return jsonify({"error": data['message']}), 400
    except requests.exceptions.HTTPError as errh:
        return jsonify({"error": str(errh)}), 500
    except requests.exceptions.ConnectionError as errc:
        return jsonify({"error": str(errc)}), 500
    except requests.exceptions.Timeout as errt:
        return jsonify({"error": str(errt)}), 500
    except requests.exceptions.RequestException as err:
        return jsonify({"error": str(err)}), 500

if __name__ == '__main__':
    app.run(debug=True)
解释：

Flask创建一个Web应用。
@app.route定义路由。
request.args.get('city')获取查询参数。
jsonify返回JSON响应。
好了，今天的分享就到这里了，我们下期见。如果本文对你有帮助，请动动你可爱的小手指点赞、转发、点个在看吧！
