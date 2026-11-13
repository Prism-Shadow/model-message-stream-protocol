# Images and vision

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

## Overview



  - **[Create images](https://developers.openai.com/api/docs/guides/image-generation)**: Use GPT Image models to generate or edit images.
- **[Process image inputs](#analyze-images)**: Use our models' vision capabilities to analyze images.



<a id="a-tour-of-image-related-use-cases"></a>

Recent language models can process image inputs and analyze them—a capability known as **vision**. GPT Image models can use text and image inputs to create new images or edit existing ones.

Choose an endpoint based on whether you want to analyze images or generate them:

| API                                                  | Supported use cases                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| [Responses API](https://developers.openai.com/api/reference/resources/responses)   | Analyze images, or generate and edit images with the image generation tool |
| [Images API](https://developers.openai.com/api/reference/resources/images)         | Generate images as output, optionally using images as input                |
| [Chat Completions API](https://developers.openai.com/api/reference/resources/chat) | Analyze images and generate text responses                                 |

To learn more about the input and output modalities supported by our models, refer to our [models page](https://developers.openai.com/api/docs/models).

## Generate or edit images

With the Images API, choose `gpt-image-2.5-sunburst` to generate images from text or edit existing images. With the Responses API, choose a mainline model that supports the image generation tool; the tool handles GPT Image model selection.



Generate images with Responses

```javascript
import OpenAI from "openai";
const openai = new OpenAI();

const response = await openai.responses.create({
  model: "gpt-6-astra",
  input:
    "Generate an image of gray tabby cat hugging an otter with an orange scarf",
  tools: [{ type: "image_generation" }],
});

// Save the image to a file
const imageData = response.output
  .filter((output) => output.type === "image_generation_call")
  .map((output) => output.result);

if (imageData.length > 0) {
  const imageBase64 = imageData[0];
  const fs = await import("fs");
  fs.writeFileSync("cat_and_otter.png", Buffer.from(imageBase64, "base64"));
}
```

```python
from openai import OpenAI
import base64

client = OpenAI()

response = client.responses.create(
    model="gpt-6-astra",
    input="Generate an image of gray tabby cat hugging an otter with an orange scarf",
    tools=[{"type": "image_generation"}],
)

# Save the image to a file
image_data = [
    output.result
    for output in response.output
    if output.type == "image_generation_call"
]

if image_data:
    image_base64 = image_data[0]
    with open("cat_and_otter.png", "wb") as f:
        f.write(base64.b64decode(image_base64))
```

```go
package main

import (
	"context"
	"encoding/base64"
	"os"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/responses"
)

func main() {
	client := openai.NewClient()

	response, err := client.Responses.New(context.Background(), responses.ResponseNewParams{
		Model: "gpt-6-astra",
		Input: responses.ResponseNewParamsInputUnion{
			OfString: openai.String("Generate an image of a gray tabby cat hugging an otter with an orange scarf."),
		},
		Tools: []responses.ToolUnionParam{{
			OfImageGeneration: &responses.ToolImageGenerationParam{},
		}},
	})
	if err != nil {
		panic(err)
	}

	for _, output := range response.Output {
		if output.Type != "image_generation_call" {
			continue
		}
		image, err := base64.StdEncoding.DecodeString(output.AsImageGenerationCall().Result)
		if err != nil {
			panic(err)
		}
		if err := os.WriteFile("cat_and_otter.png", image, 0o600); err != nil {
			panic(err)
		}
		return
	}

	panic("response did not include an image generation call")
}
```

```java
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.responses.ResponseCreateParams;
import com.openai.models.responses.Tool;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

ResponseCreateParams params =
    ResponseCreateParams.builder()
        .model("gpt-6-astra")
        .input("Generate an image of a gray tabby cat hugging an otter with an orange scarf.")
        .addTool(Tool.ImageGeneration.builder().build())
        .build();

String imageResult =
    client.responses().create(params).output().stream()
        .flatMap(item -> item.imageGenerationCall().stream())
        .flatMap(call -> call.result().stream())
        .findFirst()
        .orElseThrow(() -> new IllegalStateException("No generated image returned"));
Files.write(Path.of("cat_and_otter.png"), Base64.getDecoder().decode(imageResult));
```

```csharp
using OpenAI.Responses;
#pragma warning disable OPENAI001

string key = Environment.GetEnvironmentVariable("OPENAI_API_KEY")!;
ResponsesClient client = new(key);

CreateResponseOptions options = new()
{
    Model = "gpt-6-astra",
};
options.InputItems.Add(
    ResponseItem.CreateUserMessageItem(
        "Generate an image of a gray tabby cat hugging an otter with an orange scarf."
    )
);
options.Tools.Add(
    ResponseTool.CreateImageGenerationTool(model: "gpt-image-2")
);

ResponseResult response = await client.CreateResponseAsync(options);
ImageGenerationCallResponseItem image = response
    .OutputItems.OfType<ImageGenerationCallResponseItem>()
    .FirstOrDefault()
    ?? throw new InvalidOperationException("No generated image was returned.");
await File.WriteAllBytesAsync(
    "cat_and_otter.png",
    image.ImageResultBytes.ToArray()
);
```

```ruby
require "base64"
require "openai"

client = OpenAI::Client.new
response = client.responses.create(
  model: "gpt-6-astra",
  input: "Generate an image of a gray tabby cat hugging an otter with an orange scarf.",
  tools: [{ type: :image_generation }]
)

image_call = response.output.find do |item|
  item.is_a?(OpenAI::Models::Responses::ResponseOutputItem::ImageGenerationCall)
end
unless image_call.is_a?(OpenAI::Models::Responses::ResponseOutputItem::ImageGenerationCall)
  raise "No image generation call returned"
end

File.binwrite(
  "cat_and_otter.png",
  Base64.strict_decode64(image_call.result)
)
```

```bash
openai responses create \
  --model gpt-6-astra \
  --raw-output \
  --transform 'output.#(type=="image_generation_call").result' <<'YAML' | base64 --decode > cat_and_otter.png
tools:
  - type: image_generation
input: Generate an image of a gray tabby cat hugging an otter with an orange scarf.
YAML
```



You can learn more about image generation in our [Image
  generation](https://developers.openai.com/api/docs/guides/image-generation) guide.

### Using world knowledge for image generation

GPT Image models can draw on world knowledge without a reference image. For example, a prompt for a cabinet of semi-precious stones can produce a scene containing recognizable gemstones such as amethyst, rose quartz, and jade.

## Analyze images

Use a vision-capable model to describe images, read visible text, and answer questions about objects, shapes, colors, or textures. Account for the model's [limitations](#limitations) when using its answers.

### Giving a model images as input





Provide an image for analysis in any of these ways:

- By providing a fully qualified URL to an image file
- By providing an image as a Base64-encoded data URL
- By providing a file ID (created with the [Files API](https://developers.openai.com/api/reference/resources/files))

You can provide multiple images as input in a single request by including multiple images in the `content` array, but keep in mind that [images count as tokens](#calculating-costs) and will be billed accordingly.



Passing a URL

    Analyze the content of an image

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

const response = await openai.responses.create({
  model: "gpt-6-astra",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "what's in this image?" },
        {
          type: "input_image",
          image_url:
            "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg",
          detail: "auto",
        },
      ],
    },
  ],
});

console.log(response.output_text);
```

```python
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-6-astra",
    input=[
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": "what's in this image?"},
                {
                    "type": "input_image",
                    "image_url": "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg",
                },
            ],
        }
    ],
)

print(response.output_text)
```

```go
package main

import (
	"context"
	"fmt"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/responses"
)

func main() {
	client := openai.NewClient()

	response, err := client.Responses.New(context.Background(), responses.ResponseNewParams{
		Model: "gpt-6-astra",
		Input: responses.ResponseNewParamsInputUnion{
			OfInputItemList: responses.ResponseInputParam{
				responses.ResponseInputItemParamOfMessage(
					responses.ResponseInputMessageContentListParam{
						responses.ResponseInputContentParamOfInputText("What's in this image?"),
						{OfInputImage: &responses.ResponseInputImageParam{
							Detail:   responses.ResponseInputImageDetailAuto,
							ImageURL: openai.String("https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg"),
						}},
					},
					responses.EasyInputMessageRoleUser,
				),
			},
		},
	})
	if err != nil {
		panic(err)
	}

	fmt.Println(response.OutputText())
}
```

```java
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.responses.ResponseCreateParams;
import com.openai.models.responses.ResponseInputImage;
import com.openai.models.responses.ResponseInputItem;
import java.util.List;

ResponseInputItem imageInput =
    ResponseInputItem.ofMessage(
        ResponseInputItem.Message.builder()
            .role(ResponseInputItem.Message.Role.USER)
            .addInputTextContent("What's in this image?")
            .addContent(
                ResponseInputImage.builder()
                    .detail(ResponseInputImage.Detail.AUTO)
                    .imageUrl(
                        "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg")
                    .build())
            .build());

ResponseCreateParams params =
    ResponseCreateParams.builder()
        .model("gpt-6-astra")
        .inputOfResponse(List.of(imageInput))
        .build();

client.responses().create(params).output().stream()
    .flatMap(item -> item.message().stream())
    .flatMap(message -> message.content().stream())
    .flatMap(content -> content.outputText().stream())
    .forEach(text -> System.out.println(text.text()));
```

```csharp
using OpenAI.Responses;
#pragma warning disable OPENAI001

string key = Environment.GetEnvironmentVariable("OPENAI_API_KEY")!;
ResponsesClient client = new(key);

Uri imageUrl = new(
    "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg"
);

ResponseResult response = await client.CreateResponseAsync(
    "gpt-6-astra",
    [
        ResponseItem.CreateUserMessageItem(
            [
                ResponseContentPart.CreateInputTextPart("What is in this image?"),
                ResponseContentPart.CreateInputImagePart(imageUrl),
            ]
        ),
    ]
);

Console.WriteLine(response.GetOutputText());
```

```ruby
require "openai"

client = OpenAI::Client.new

response = client.responses.create(
  model: "gpt-6-astra",
  input: [
    {
      role: :user,
      content: [
        {
          type: :input_text,
          text: "What's in this image?"
        },
        {
          type: :input_image,
          detail: :auto,
          image_url: "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg"
        }
      ]
    }
  ]
)

puts(response.output_text)
```

```bash
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-6-astra",
    "input": [
      {
        "role": "user",
        "content": [
          {"type": "input_text", "text": "what is in this image?"},
          {
            "type": "input_image",
            "image_url": "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg"
          }
        ]
      }
    ]
  }'
```

```bash
openai responses create \
  --model gpt-6-astra \
  --raw-output \
  --transform 'output.#(type=="message").content.0.text' <<'YAML'
input:
  - role: user
    content:
      - type: input_text
        text: What is in this image?
      - type: input_image
        image_url: https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg
YAML
```

  

  

    
Passing a Base64 encoded image

    Analyze the content of an image

```javascript
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

const imagePath = "fixtures/example.jpg";
const base64Image = fs.readFileSync(imagePath, "base64");

const response = await openai.responses.create({
  model: "gpt-6-astra",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "what's in this image?" },
        {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${base64Image}`,
          detail: "auto",
        },
      ],
    },
  ],
});

console.log(response.output_text);
```

```python
import base64
from openai import OpenAI

client = OpenAI()


# Function to encode the image
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


# Path to your image
image_path = "path_to_your_image.jpg"

# Getting the Base64 string
base64_image = encode_image(image_path)


response = client.responses.create(
    model="gpt-6-astra",
    input=[
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": "what's in this image?"},
                {
                    "type": "input_image",
                    "image_url": f"data:image/jpeg;base64,{base64_image}",
                },
            ],
        }
    ],
)

print(response.output_text)
```

```go
package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/responses"
)

func main() {
	client := openai.NewClient()
	image, err := os.ReadFile("image.png")
	if err != nil {
		panic(err)
	}
	imageURL := "data:image/png;base64," + base64.StdEncoding.EncodeToString(image)

	response, err := client.Responses.New(context.Background(), responses.ResponseNewParams{
		Model: "gpt-6-astra",
		Input: responses.ResponseNewParamsInputUnion{
			OfInputItemList: responses.ResponseInputParam{
				responses.ResponseInputItemParamOfMessage(
					responses.ResponseInputMessageContentListParam{
						responses.ResponseInputContentParamOfInputText("What's in this image?"),
						{OfInputImage: &responses.ResponseInputImageParam{
							Detail:   responses.ResponseInputImageDetailAuto,
							ImageURL: openai.String(imageURL),
						}},
					},
					responses.EasyInputMessageRoleUser,
				),
			},
		},
	})
	if err != nil {
		panic(err)
	}

	fmt.Println(response.OutputText())
}
```

```java
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.responses.ResponseCreateParams;
import com.openai.models.responses.ResponseInputImage;
import com.openai.models.responses.ResponseInputItem;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;

String imageBase64 =
    Base64.getEncoder()
        .encodeToString(
            Files.readAllBytes(Path.of(System.getenv("OPENAI_EXAMPLE_IMAGE_PATH"))));

ResponseInputItem imageInput =
    ResponseInputItem.ofMessage(
        ResponseInputItem.Message.builder()
            .role(ResponseInputItem.Message.Role.USER)
            .addInputTextContent("What's in this image?")
            .addContent(
                ResponseInputImage.builder()
                    .detail(ResponseInputImage.Detail.AUTO)
                    .imageUrl("data:image/png;base64," + imageBase64)
                    .build())
            .build());

ResponseCreateParams params =
    ResponseCreateParams.builder()
        .model("gpt-6-astra")
        .inputOfResponse(List.of(imageInput))
        .build();

client.responses().create(params).output().stream()
    .flatMap(item -> item.message().stream())
    .flatMap(message -> message.content().stream())
    .flatMap(content -> content.outputText().stream())
    .forEach(text -> System.out.println(text.text()));
```

```csharp
using OpenAI.Responses;
#pragma warning disable OPENAI001

string key = Environment.GetEnvironmentVariable("OPENAI_API_KEY")!;
ResponsesClient client = new(key);

Uri imageUrl = new(
    "https://openai-documentation.vercel.app/images/cat_and_otter.png"
);

using HttpClient http = new();

// Download an image as a stream.
using Stream stream = await http.GetStreamAsync(imageUrl);
BinaryData imageData = BinaryData.FromStream(stream, "image/png");

ResponseResult response1 = await client.CreateResponseAsync(
    "gpt-6-astra",
    [
        ResponseItem.CreateUserMessageItem(
            [
                ResponseContentPart.CreateInputTextPart("What is in this image?"),
                ResponseContentPart.CreateInputImagePart(imageData),
            ]
        ),
    ]
);

Console.WriteLine($"From image stream: {response1.GetOutputText()}");

// Download an image as a byte array.
byte[] bytes = await http.GetByteArrayAsync(imageUrl);
imageData = BinaryData.FromBytes(bytes, "image/png");

ResponseResult response2 = await client.CreateResponseAsync(
    "gpt-6-astra",
    [
        ResponseItem.CreateUserMessageItem(
            [
                ResponseContentPart.CreateInputTextPart("What is in this image?"),
                ResponseContentPart.CreateInputImagePart(imageData),
            ]
        ),
    ]
);

Console.WriteLine($"From byte array: {response2.GetOutputText()}");
```

```ruby
require "base64"
require "openai"

client = OpenAI::Client.new
image = Base64.strict_encode64(File.binread("image.png"))

response = client.responses.create(
  model: "gpt-6-astra",
  input: [
    {
      role: :user,
      content: [
        {
          type: :input_text,
          text: "What's in this image?"
        },
        {
          type: :input_image,
          detail: :auto,
          image_url: "data:image/png;base64,#{image}"
        }
      ]
    }
  ]
)

puts(response.output_text)
```

  

  

    
Passing a file ID

    Analyze the content of an image

```javascript
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI();

// Function to create a file with the Files API
async function createFile(filePath) {
  const fileContent = fs.createReadStream(filePath);
  const result = await openai.files.create({
    file: fileContent,
    purpose: "vision",
  });
  return result.id;
}

// Getting the file ID
const fileId = await createFile("fixtures/example.jpg");

const response = await openai.responses.create({
  model: "gpt-6-astra",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "what's in this image?" },
        {
          type: "input_image",
          file_id: fileId,
          detail: "auto",
        },
      ],
    },
  ],
});

console.log(response.output_text);
```

```python
from openai import OpenAI

client = OpenAI()


# Function to create a file with the Files API
def create_file(file_path):
    with open(file_path, "rb") as file_content:
        result = client.files.create(
            file=file_content,
            purpose="vision",
        )
        return result.id


# Getting the file ID
file_id = create_file("path_to_your_image.jpg")

response = client.responses.create(
    model="gpt-6-astra",
    input=[
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": "what's in this image?"},
                {
                    "type": "input_image",
                    "file_id": file_id,
                },
            ],
        }
    ],
)

print(response.output_text)
```

```go
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/responses"
)

func main() {
	client := openai.NewClient()
	file, err := os.Open("image.png")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	uploaded, err := client.Files.New(context.Background(), openai.FileNewParams{
		File:    file,
		Purpose: openai.FilePurposeVision,
	})
	if err != nil {
		panic(err)
	}

	response, err := client.Responses.New(context.Background(), responses.ResponseNewParams{
		Model: "gpt-6-astra",
		Input: responses.ResponseNewParamsInputUnion{
			OfInputItemList: responses.ResponseInputParam{
				responses.ResponseInputItemParamOfMessage(
					responses.ResponseInputMessageContentListParam{
						responses.ResponseInputContentParamOfInputText("What's in this image?"),
						{OfInputImage: &responses.ResponseInputImageParam{
							Detail: responses.ResponseInputImageDetailAuto,
							FileID: openai.String(uploaded.ID),
						}},
					},
					responses.EasyInputMessageRoleUser,
				),
			},
		},
	})
	if err != nil {
		panic(err)
	}

	fmt.Println(response.OutputText())
}
```

```java
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.files.FileCreateParams;
import com.openai.models.files.FilePurpose;
import com.openai.models.responses.ResponseCreateParams;
import com.openai.models.responses.ResponseInputImage;
import com.openai.models.responses.ResponseInputItem;
import java.nio.file.Path;
import java.util.List;

var file =
    client
        .files()
        .create(
            FileCreateParams.builder()
                .file(Path.of(System.getenv("OPENAI_EXAMPLE_FILE_PATH")))
                .purpose(FilePurpose.VISION)
                .build());

var response =
    client
        .responses()
        .create(
            ResponseCreateParams.builder()
                .model("gpt-6-astra")
                .inputOfResponse(
                    List.of(
                        ResponseInputItem.ofMessage(
                            ResponseInputItem.Message.builder()
                                .role(ResponseInputItem.Message.Role.USER)
                                .addInputTextContent("What's in this image?")
                                .addContent(
                                    ResponseInputImage.builder()
                                        .detail(ResponseInputImage.Detail.AUTO)
                                        .fileId(file.id())
                                        .build())
                                .build())))
                .build());
response.output().stream()
    .flatMap(item -> item.message().stream())
    .flatMap(message -> message.content().stream())
    .flatMap(content -> content.outputText().stream())
    .forEach(text -> System.out.println(text.text()));
```

```csharp
using OpenAI.Files;
using OpenAI.Responses;
#pragma warning disable OPENAI001

string key = Environment.GetEnvironmentVariable("OPENAI_API_KEY")!;
ResponsesClient client = new(key);

string filename = "cat_and_otter.png";
Uri imageUrl = new(
    $"https://openai-documentation.vercel.app/images/{filename}"
);

using HttpClient http = new();

// Download an image as a stream.
using Stream stream = await http.GetStreamAsync(imageUrl);

OpenAIFileClient files = new(key);

OpenAIFile file = await files.UploadFileAsync(
    stream,
    filename,
    FileUploadPurpose.Vision
);

ResponseResult response = await client.CreateResponseAsync(
    "gpt-6-astra",
    [
        ResponseItem.CreateUserMessageItem(
            [
                ResponseContentPart.CreateInputTextPart("what's in this image?"),
                ResponseContentPart.CreateInputImagePart(file.Id),
            ]
        ),
    ]
);

Console.WriteLine(response.GetOutputText());
```

```ruby
require "openai"
require "pathname"

client = OpenAI::Client.new
uploaded = client.files.create(
  file: Pathname("image.png"),
  purpose: :vision
)

response = client.responses.create(
  model: "gpt-6-astra",
  input: [
    {
      role: :user,
      content: [
        {
          type: :input_text,
          text: "What's in this image?"
        },
        {
          type: :input_image,
          detail: :auto,
          file_id: uploaded.id
        }
      ]
    }
  ]
)

puts(response.output_text)
```




### Image input requirements

Use supported image files that are clear enough for the model to analyze.

| Requirement  | Supported inputs                                                                      |
| ------------ | ------------------------------------------------------------------------------------- |
| File types   | PNG (`.png`), JPEG (`.jpeg` or `.jpg`), WEBP (`.webp`), and non-animated GIF (`.gif`) |
| Request size | Up to 512 MB total payload per request                                                |
| Image count  | Up to 1,500 images per request                                                        |

For [patch-based image inputs](#patch-based-image-tokenization), the API supports up to 30,000 patches per image after applying the resizing rules for the selected model and `detail` level. This limit applies across supported detail levels and to each image separately, not to the combined patch count of the request.

Lower model- and detail-specific resizing budgets still apply. Images that exceed the 30,000-patch limit after processing are rejected, not automatically resized to meet it. Reduce the image's dimensions and try again.

Image tokens and the rest of your prompt must also fit the model's input and context limits. A token estimate does not guarantee that a request meets every input limit. Image use must comply with our [usage policies](https://openai.com/policies/usage-policies/).

### Choose an image detail level

The `detail` parameter controls image preprocessing. Supported values depend on the model: `low`, `high`, `original`, or `auto`. If you omit the parameter, it defaults to `auto` in both the Responses API and the Chat Completions API. The [model sizing table](#model-sizing-behavior) shows the corresponding behavior.




```plain
{
    "type": "input_image",
    "image_url": "https://api.nga.gov/iiif/a2e6da57-3cd1-4235-b20e-95dcaefed6c8/full/!800,800/0/default.jpg",
    "detail": "original"
}
```



Use the following guidance to choose a detail level:

| Detail level | Best for                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `low`        | Coarse image understanding. Resizing and token use depend on the model; `low` does not always use fewer tokens than `high`. |
| `high`       | Standard high-fidelity image understanding when precise original-image coordinates are not required.                        |
| `original`   | Large, dense, spatially sensitive, or computer-use images, when supported by the model.                                     |
| `auto`       | Use the model's default sizing behavior, shown in the model sizing table.                                                   |

For tasks that require fine visual detail or precise coordinates, such as optical character recognition (OCR), small-object detection, or computer use, use `"detail": "original"` when supported. Original detail can still resize images to meet the model's pixel-dimension limit or resizing patch budget, but not to meet the separate 30,000-patch rejection limit. For coordinate-sensitive tasks, resize images to fit those limits before sending them and map returned coordinates back to the original image. See the [Computer use guide](https://developers.openai.com/api/docs/guides/tools-computer-use) for coordinate handling.

### Model sizing behavior

The following table summarizes sizing behavior for general-purpose vision models. Other models and specialized variants can use different limits. All resizing preserves aspect ratio without enlarging smaller images.

<table>
  <tr>
    <th>Model family</th>
    <th>Supported detail levels</th>
    <th>Patch and resizing behavior</th>
  </tr>
  <tr>
    <td>
      `gpt-6-astra`
    </td>
    <td>
      `low`, `high`, `original`,
      `auto`
    </td>
    <td>
      `low` fits within 512 × 512 pixels. `high` allows up
      to 2,500 patches and a 65,535-pixel maximum dimension. Both limits apply. 
      `original` preserves the image's dimensions, except that images
      larger than 65,535 pixels on either side are scaled down to fit that
      limit. If the resulting image requires more than 
      [30,000 patches](#image-input-requirements), the API rejects
      the request; the image is not resized to fit the patch limit. 
      `auto` uses the same sizing behavior as `original`.
    </td>
  </tr>
  <tr>
    <td>
      `gpt-5.6-sol`, `gpt-5.6-terra`, 
      `gpt-5.6-luna`
    </td>
    <td>
      `low`, `high`, `original`,
      `auto`
    </td>
    <td>
      `low` fits within 512 × 512 pixels. `high` fits
      within 2048 × 2048 pixels and 2,500 patches. `original` 
      preserves the image's dimensions, except that images larger than 65,535
      pixels on either side are scaled down to fit that limit. If the resulting
      image requires more than 
      [30,000 patches](#image-input-requirements), the API rejects
      the request; the image is not resized to fit the patch limit. 
      `auto` uses the same sizing behavior as `original`.
    </td>
  </tr>
  <tr>
    <td>
      `gpt-5.5`
    </td>
    <td>
      `low`, `high`, `original`,
      `auto`
    </td>
    <td>
      `low` fits within 512 × 512 pixels. `high` allows up
      to 2,500 patches and a 2048-pixel maximum dimension. `original` 
      allows up to 10,000 patches and a 6000-pixel maximum dimension. Both
      limits apply. `auto` uses the same sizing behavior as 
      `original`.
    </td>
  </tr>
  <tr>
    <td>
      `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`
    </td>
    <td>
      `low`, `high`, `original`,
      `auto`
    </td>
    <td>
      `low` uses a 2048-pixel maximum dimension and a 6,144-patch
      budget, so it can use more tokens than `high`. 
      `high` allows up to 2,500 patches and a 2048-pixel maximum
      dimension. `original` allows up to 10,000 patches and a
      6000-pixel maximum dimension. Both limits apply. `auto` uses
      the same sizing behavior as `high`.
    </td>
  </tr>
  <tr>
    <td>
      `gpt-5.2`, `gpt-4.1-mini`
    </td>
    <td>
      `low`, `high`, `auto`
    </td>
    <td>
      These detail levels use the same sizing limits: a 2048-pixel maximum
      dimension and a 6,144-patch budget. `original` is not
      supported.
    </td>
  </tr>
  <tr>
    <td>
      `gpt-5.1`, `gpt-4.1`, `gpt-4o`,
      `gpt-4o-mini`
    </td>
    <td>
      `low`, `high`, `auto`
    </td>
    <td>
      `low` uses a fixed token count. `high` and 
      `auto` use the 
      [tile-based sizing rules](#tile-based-image-tokenization).
    </td>
  </tr>
</table>

## Calculating costs

Vision models convert image inputs into billable input tokens. The [image input cost calculator](https://developers.openai.com/api/docs/guides/image-cost-calculator) and patch/tile rules in this section cover vision-model inputs, not GPT Image generation or editing. See [GPT Image model inputs](#gpt-image-model-inputs) for that separate pricing.

Image tokens also count toward your [tokens per minute (TPM) limits](https://developers.openai.com/api/docs/guides/rate-limits). The calculator estimates one image at standard input rates; it does not include the rest of your prompt or model output.

### Image input cost calculator

Use the [image input cost calculator](https://developers.openai.com/api/docs/guides/image-cost-calculator) to estimate input tokens and cost for one image by model, image size, and detail level.

### Patch-based image tokenization

Some models tokenize images by covering them with 32px x 32px patches. Many model and detail-level combinations define a resizing patch budget. First, the API fits the image within the selected detail level's pixel-dimension limit, preserving aspect ratio and rounding to integer pixels without enlarging smaller images. The token cost is then determined as follows:

A. Compute how many 32px x 32px patches are needed to cover the image after applying the pixel-dimension limit. A patch may extend beyond the image boundary.

```text
patch_count = ceil(width/32)×ceil(height/32)
```

B. When the selected model and detail level specify a resizing patch budget, scale the image down proportionally if it exceeds that budget. Otherwise, skip this step. Adjust the scale to stay within budget after converting to integer pixel dimensions and computing patch coverage. Keep full precision until calculating the final dimensions.

```text
shrink_factor = sqrt((32^2 * patch_budget) / (width * height))
adjusted_shrink_factor = shrink_factor * min(
  floor(width * shrink_factor / 32) / (width * shrink_factor / 32),
  floor(height * shrink_factor / 32) / (height * shrink_factor / 32)
)
```

C. If step B resized the image, round down the final scaled width and height to integer pixels. Compute the patches needed to cover the resulting image. This is the image-token count before applying the model multiplier. When a patch budget applies, this count stays within that budget.

```text
resized_patch_count = ceil(resized_width/32)×ceil(resized_height/32)
```

If this count exceeds 30,000 patches, the API rejects the request. Check this limit before applying the token multiplier.

D. Multiply the patch count by the model's multiplier and round up to get the billable image input tokens. Apply the model's input price to those tokens once; the multiplier does not apply to other prompt tokens or to the price again.

| Model                                  | Multiplier |
| -------------------------------------- | ---------- |
| `gpt-6-astra`                          | 1.2        |
| `gpt-5.6-sol`                          | 1.2        |
| `gpt-5.6-terra`                        | 1.2        |
| `gpt-5.6-luna`                         | 1.2        |
| `gpt-5.5`                              | 1.2        |
| `gpt-5.4`                              | 1.2        |
| `gpt-5.4-mini`                         | 1.2        |
| `gpt-5.4-nano`                         | 1.2        |
| `gpt-5.2`                              | 1.2        |
| `gpt-5-mini`\*                         | 1.2        |
| `gpt-5-nano`\*                         | 1.5        |
| `gpt-4.1-mini`                         | 1.62       |
| `gpt-4.1-nano`\* (2025-04-14 snapshot) | 2.46       |
| `o4-mini`\*                            | 1.72       |

_For `gpt-4.1-mini`, this applies to the 2025-04-14 snapshot._

\* Deprecated and scheduled for shutdown. See the [deprecation schedule](https://developers.openai.com/api/docs/deprecations) for dates and replacements. These models aren't included in the calculator or the model sizing table above.

**Image token calculation examples for `gpt-6-astra` with `detail: high`**

This combination uses a 65,535-pixel maximum dimension, a 2,500-patch budget, and a 1.2× multiplier.

- A 1024 × 1024 image needs `32 × 32 = 1024` patches. No resizing is needed. The billable image input is `ceil(1024 × 1.2) = 1229` tokens.
- A 2048 × 2048 image initially needs `64 × 64 = 4096` patches. The patch budget reduces it to 1600 × 1600 pixels, or `50 × 50 = 2500` patches. The estimate is `ceil(2500 × 1.2) = 3000` tokens.
- A 4096 × 512 image stays at its original size: `128 × 16 = 2048` patches and `ceil(2048 × 1.2) = 2458` tokens.

Floating-point rounding in billing can make the final count differ from the estimate by one token.

### Tile-based image tokenization

<a id="gpt-4o-gpt-41-gpt-4o-mini-cua-and-o-series-except-o4-mini"></a>

The models in this table use a base token count plus tokens for image tiles:

| Model                      | Base tokens | Tile tokens |
| -------------------------- | ----------- | ----------- |
| `gpt-5.1`                  | 70          | 140         |
| `gpt-5`\*                  | 70          | 140         |
| `gpt-4o`, `gpt-4.1`        | 85          | 170         |
| `gpt-4o-mini`              | 2833        | 5667        |
| `o1`\*, `o1-pro`\*, `o3`\* | 75          | 150         |

\* Deprecated and scheduled for shutdown. See the [deprecation schedule](https://developers.openai.com/api/docs/deprecations) for dates and replacements. These models aren't included in the calculator or the model sizing table above.

With `"detail": "low"`, an image costs only the model's base tokens, regardless of dimensions. With `"detail": "high"` or `"detail": "auto"`:

- Scale down to fit in a 2048px x 2048px square, maintaining aspect ratio. Smaller images are not enlarged.
- If the shortest side exceeds 768px, scale it down to 768px and round down the other dimension.
- Count the 512px squares needed to cover the image. Each square uses the model's tile tokens.
- Add the model's base tokens to the tile tokens.

### GPT Image model inputs

GPT Image models use separate image-token pricing for generation and editing. The vision calculator does not estimate their input or output costs. For current rates, see [image generation pricing](https://developers.openai.com/api/docs/pricing#image-generation); for generation and editing workflows, see the [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation).

#### GPT Image 1

`gpt-image-1` was shut down on October 23, 2026. The following input-token rules are retained for historical cost comparisons. See the [deprecation notice](https://developers.openai.com/api/docs/deprecations#2026-04-22-legacy-gpt-model-snapshots) for replacement models.

For legacy requests, use tile-based image sizing, but scale the shortest side down to 512px instead of 768px. Token use depends on the image dimensions and the `input_fidelity` parameter in the [Images API](https://developers.openai.com/api/reference/resources/images/methods/edit).

When input fidelity is set to low, the base cost is 65 image tokens, and each tile costs 129 image tokens.
When using high input fidelity, we add a set number of tokens based on the image's aspect ratio in addition to the image tokens described above.

- If your image is square, we add 4160 extra input image tokens.
- If it is closer to portrait or landscape, we add 6240 extra tokens.

For historical image input-token prices, see the [GPT Image 1 model page](https://developers.openai.com/api/docs/models/gpt-image-1).

## Limitations

Vision models can make mistakes. Account for these limitations when designing your application:

- **Medical images**: The model is not suitable for interpreting specialized medical images like CT scans and shouldn't be used for medical advice.
- **Non-English**: The model may not perform optimally when handling images with text of non-Latin alphabets, such as Japanese or Korean.
- **Small text**: Enlarge text within the image to improve readability. When available, using `"detail": "original"` can also help performance.
- **Rotation**: The model may misinterpret rotated or upside-down text and images.
- **Visual elements**: The model may struggle to understand graphs or text where colors or styles—like solid, dashed, or dotted lines—vary.
- **Spatial reasoning**: The model struggles with tasks requiring precise spatial localization, such as identifying chess positions.
- **Accuracy**: The model may generate incorrect descriptions or captions in certain scenarios.
- **Image shape**: The model struggles with panoramic and fisheye images.
- **Metadata and resizing**: The model doesn't process original file names or metadata. Images may be resized before analysis, including with `original` detail. See [Model sizing behavior](#model-sizing-behavior) for the limits that apply to each model.
- **Counting**: The model may give approximate counts for objects in images.
- **CAPTCHAs**: For safety reasons, our system blocks the submission of CAPTCHAs.