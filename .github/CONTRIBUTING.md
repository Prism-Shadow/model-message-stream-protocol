# Contributing

## Python Package

### Style guide

We follow the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html), check it for details.

### Create a Pull Request

1. Clone the repo to local disk

```bash
git clone https://github.com/Prism-Shadow/mmsp.git
cd mmsp
```

2. Create a new branch

```bash
git checkout -b your_name/dev
```

3. Set up a development environment

```bash
cd src_py
uv sync --dev
```

4. Check code before commit

```bash
make lint && make test
```

5. Submit changes

```bash
git add .
git commit -m "commit message"
git push origin your_name/dev
```

6. Create a merge request from your branch `your_name/dev`

7. Update your local repository

```bash
git checkout main && git pull
```

## TypeScript Package

### Style guide

We use ESLint for code quality and follow TypeScript strict mode conventions.

### Create a Pull Request

1. Clone the repo to local disk

```bash
git clone https://github.com/Prism-Shadow/mmsp.git
cd mmsp
```

2. Create a new branch

```bash
git checkout -b your_name/dev
```

3. Set up a development environment

```bash
cd src_ts
npm install
```

4. Check code before commit

```bash
make lint && make test
```

5. Submit changes

```bash
git add .
git commit -m "commit message"
git push origin your_name/dev
```

6. Create a merge request from your branch `your_name/dev`

7. Update your local repository

```bash
git checkout main && git pull
```
