"""Build the three static pages from small shared components. No dependencies."""
from pathlib import Path
from html import escape
import shutil

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
REPO = ROOT.parent

def header(page):
    links = [('index.html', 'Overview'), ('progress.html', 'Phases &amp; progress'), ('languages.html', 'Languages')]
    nav = ''.join(f'<a href="{url}"' + (' aria-current="page"' if url == page else '') + f'>{label}</a>' for url, label in links)
    return f'<a class="skip" href="#main">Skip to content</a><header class="container header"><a class="wordmark" href="index.html" aria-label="Impossible home">impossible<span>/</span></a><nav class="nav" aria-label="Main navigation">{nav}</nav><a class="header-contact" href="#contact">Get in touch <span aria-hidden="true">↗</span></a></header>'

def footer():
    return '''<footer class="container footer" id="contact">
<div class="contact surface" data-sheen><h2>Let’s build<br><span>what’s next.</span></h2><div class="contact-links"><a href="mailto:adiyn.ms6@gmail.com">adiyn.ms6@gmail.com <span aria-hidden="true">↗</span></a><a href="tel:+17373287490">737 328 7490</a></div></div>
<div class="footer-index"><div><a class="wordmark" href="index.html">impossible<span>/</span></a><p>CUDA to NPU research.<br>Rust at the core. Evidence at every gate.</p></div><div><a href="index.html">Overview</a><a href="progress.html">Phases &amp; progress</a><a href="languages.html">Languages</a></div><div><a href="index.html#journey">How it works</a><a href="index.html#finished">The finished vision</a><a href="mailto:adiyn.ms6@gmail.com">Start a conversation</a></div></div>
<div class="footer-bottom"><span>© 2026 Impossible. An independent project.</span><span>Independent research. Qualcomm and NVIDIA trademarks belong to their owners.</span><a href="#main">Back to top</a></div><p class="photo-credit">Landscape by <a href="https://unsplash.com/photos/3sc0AFcKoAo">Pascal Debrunner on Unsplash</a>. Original laptop and chip models released under <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>.</p></footer>'''

def page(filename, title, description, content, script=''):
    html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="{escape(description)}"><title>{escape(title)}</title><link rel="stylesheet" href="styles.css"></head><body data-page="{filename.removesuffix('.html')}">{header(filename)}<main id="main">{content}</main>{footer()}<script src="surfaces.js" defer></script>{script}</body></html>'''
    (DIST / filename).write_text(html, encoding='utf-8')

kernel = '''<div class="source-record surface" data-sheen>
  <div class="code">
    <div class="file-label"><span>vector_add.cu</span><span>CUDA C++</span></div>
    <pre><code><span class="code-line"><span class="syntax">__global__ void</span> vector_add(</span><span class="code-line">    const float* a, const float* b,</span><span class="code-line">    float* out, int n) {</span><span class="code-line">  int i = blockIdx.x * blockDim.x</span><span class="code-line">        + threadIdx.x;</span><span class="code-line">  <span class="syntax-warm">if</span> (i &lt; n) out[i] = a[i] + b[i];</span><span class="code-line">}</span></code></pre>
  </div>
  <div class="record">
    <div class="route"><span>CUDA</span><i aria-hidden="true"></i><span>Rust IR</span><i aria-hidden="true"></i><span>LLVM</span><i aria-hidden="true"></i><span>Hexagon</span></div>
    <p><strong>Source-to-simulator verified</strong>Bounded FP32 vector add. Broader CUDA compatibility remains planned.</p>
  </div>
</div>'''

motion = (ROOT / 'motion-fragment.html').read_text(encoding='utf-8')

page('index.html', 'Impossible | CUDA beyond the GPU', 'Explore the CUDA-to-Hexagon compiler journey and the future of a qualified local-inference platform.', f'''
<div class="dusk-scene"><img class="landscape" src="assets/dusk-mountains.jpg" alt="Sunset above forested mountain ridges and a valley of fog" width="2400" height="1600" fetchpriority="high"><div class="landscape-scrim"></div></div>
<section class="container hero" aria-labelledby="hero-heading">
  <div class="hero-copy"><h1 id="hero-heading">Same CUDA.<br><span>New horizons.</span></h1><p>A Rust and LLVM path from CUDA to Qualcomm Hexagon.</p><div class="actions"><a class="button" href="#journey">Follow the transformation <span aria-hidden="true">↗</span></a><a class="text-link" href="#finished">The finished vision</a></div></div>
  <div class="hero-product">{kernel}<img class="hero-silicon" src="assets/silicon-studio.webp" alt="Illustrated NPU with a sapphire glass cover and gold connections" width="1200" height="1120" fetchpriority="high"></div>
</section>
<section class="container intro section"><h2>Beyond one kernel.</h2><div><p>Reuse supported CUDA for local AI, starting with Snapdragon X2 Elite.</p><a href="progress.html">See the current progress</a></div></section>
{motion}
<section class="vision-section" id="finished"><div class="container vision-layout">
  <div class="vision-intro"><h2>What finished<br><span>could look like.</span></h2><p>The release goal is local inference with documented compatibility and measured performance.</p><img src="assets/silicon-studio.webp" alt="" width="1200" height="1120" loading="lazy"></div>
  <div class="vision-list"><article><span>Bring your work</span><h3>Supported CUDA.<br>Supported models.</h3><p>CUDA source and versioned PyTorch/ONNX adapters feed a shared IR and runtime.</p></article><article><span>Build an application</span><h3>Local AI,<br>native integration.</h3><p>Rust and C/C++ interfaces for vision, language, speech and multimodal pipelines.</p></article><article><span>Trust the deployment</span><h3>Known placement.<br>Measured limits.</h3><p>Qualified hardware, explicit fallback and published correctness, latency and throughput evidence.</p></article></div>
  <div class="vision-foot"><span>Planned release capabilities.</span><a href="progress.html">Explore the remaining phases <span aria-hidden="true">↗</span></a></div>
</div></section>
<section class="container section today"><div class="section-head"><h2>Today, the bridge<br><span>is taking shape.</span></h2><p>Bounded phases 0 through 3 are complete. Physical MLP execution exists; phase 4 qualification remains open.</p></div><div class="today-links"><a class="surface" data-sheen href="progress.html"><span>Phases &amp; progress</span><strong>Follow the work.</strong><i aria-hidden="true">↗</i></a><a class="surface" data-sheen href="languages.html"><span>Languages &amp; architecture</span><strong>Understand the stack.</strong><i aria-hidden="true">↗</i></a></div></section>''', '<script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script><script type="module" src="journey.js"></script>')

phases = [
('00','Scope & feasibility','complete','Workload contracts, toolchain feasibility and reference-target planning.'),
('01','Upstream baselines','complete','Native reference execution and reproducible measurement methodology.'),
('02','Portable foundation','complete','Bounded IR, CPU runtime and project LLVM-v75 simulator execution.'),
('03','CUDA translation','complete','Standalone FP32 vector-add source imports and passes the simulator gate.'),
('04','Inference alpha','active','Physical MLP execution and host integration exist. Full vision, deployment and performance gates remain open.'),
('05','Embeddings & vision','planned','Framework/model integration and the W01 to W05 application pipelines.'),
('06','Local language models','planned','W06 prefill, decode, cache state and application integration.'),
('07','Speech & audio','planned','W07 to W09 recognition, streaming audio and speech generation.'),
('08','Diffusion & multimodal','planned','W10 to W12 diffusion, vision-language and video pipelines.'),
('09','Hardware portability','planned','Another Qualcomm generation and an independent second-vendor backend.'),
('10','Production hardening','planned','Compatibility gaps, sustained behavior and deployment qualification.'),
('11','Final audit & release','planned','Audit correctness, placement, workloads, performance and release evidence.')]
labels = {'complete':'Complete (bounded)', 'active':'In progress', 'planned':'Planned'}
rows = ''.join(f'<article class="phase" data-status="{status}"><span class="phase-num">{num}</span><div><h3>{title}</h3><p>{desc}</p></div><span class="phase-status">{labels[status]}</span></article>' for num,title,status,desc in phases)
phase_rail = ''.join(f'<span data-status="{status}"><b>{num}</b></span>' for num,_,status,_ in phases)
page('progress.html','Phases & progress | Impossible','The twelve-phase project roadmap, with completed foundations, active inference work and planned qualification.',f'''
<section class="container inner-hero progress-hero">
  <div class="inner-copy"><h1>Progress is earned.<br><span>Gate by gate.</span></h1><p>From a bounded compiler foundation to a qualified inference platform.</p><div class="actions"><a class="button" href="#roadmap">Explore the phases <span aria-hidden="true">↓</span></a><a class="text-link" href="#phase-four">Inside phase 4</a></div></div>
  <div class="phase-feature surface" data-sheen>
    <div class="phase-feature-head"><span>Current focus</span><span class="live-status">In progress</span></div>
    <div class="phase-feature-title"><span class="phase-figure">04</span><h2>Inference<br>alpha.</h2></div>
    <p>Physical MLP execution.<br>Full qualification ahead.</p>
    <div class="phase-rail" role="img" aria-label="Twelve phases. Phases 0 through 3 are complete within their bounded scope. Phase 4 is active. Phases 5 through 11 are planned.">{phase_rail}</div>
  </div>
  <div class="phase-summary"><div><span>Completed gates</span><strong>Phases 0 through 3</strong></div><div><span>Target platform</span><strong>Qualcomm Hexagon</strong></div><div><span>Checklist recorded</span><strong>1 November 2026</strong></div></div>
</section>
<section class="container section" id="phase-four"><div class="section-head"><h2>Inside phase 4.</h2><p>The checklist records 28 completed and 16 remaining work packages. These are planning units with unequal effort.</p></div><div class="principles"><article class="surface" data-sheen><span class="principle-status">Demonstrated</span><h3>From the simulator<br>to the device.</h3><p>CPU model references, physical MLP execution, explicit Rust FastRPC transport and bounded host integration.</p></article><article class="surface" data-sheen><span class="principle-status">Still open</span><h3>A wider set<br>of workloads.</h3><p>Complete target vision, broader placement, deployment and hardware performance qualification.</p></article><article class="surface" data-sheen><span class="principle-status">Completion rule</span><h3>Evidence at<br>every gate.</h3><p>All required tasks and the exit gate must pass. Package counts do not establish a completion percentage.</p></article></div></section>
<section class="container section" id="roadmap"><div class="section-head"><h2>The full path.</h2><p>Phases can overlap. Each keeps its own acceptance requirements.</p></div><div class="filter" role="group" aria-label="Filter phases" hidden><button type="button" data-filter="all" aria-pressed="true">All phases</button><button type="button" data-filter="complete" aria-pressed="false">Complete</button><button type="button" data-filter="active" aria-pressed="false">In progress</button><button type="button" data-filter="planned" aria-pressed="false">Planned</button></div><div class="phase-list">{rows}</div><p class="note" id="filter-status" role="status"></p></section>
<section class="container section"><div class="statement surface" data-sheen><h2>Execution is a milestone.<br><span>Qualification is the goal.</span></h2><p>Simulator success does not establish physical performance. A bounded device result does not establish complete model support.</p><a class="text-link" href="index.html#finished">The finished vision <span aria-hidden="true">↗</span></a></div><p class="note">Snapshot from the local plan. This page does not update automatically.</p></section>''','<script src="progress.js" defer></script>')

page('languages.html','Languages & CUDA support | Impossible','How Rust, CUDA C++, LLVM, C and Python fit together, and what the supported CUDA v0 contract accepts.',f'''
<section class="container inner-hero languages-hero">
  <div class="inner-copy"><h1>Familiar source.<br><span>A new target.</span></h1><p>CUDA at the entry. Rust in the middle. LLVM below.</p><div class="actions"><a class="button" href="#language-stack">Explore the stack <span aria-hidden="true">↓</span></a><a class="text-link" href="#cuda-contract">See supported CUDA</a></div></div>
  <figure class="architecture-art"><img src="assets/compiler-studio.webp" alt="Glass layers labelled CUDA C++, Rust IR, LLVM IR and Hexagon above an illustrated NPU" width="1200" height="1120"><figcaption>One operation. Every layer of the compiler.</figcaption></figure>
</section>
<section class="container section" id="language-stack"><div class="section-head"><h2>What each<br><span>language does.</span></h2><p>Familiar languages, with a distinct role at each layer of the compiler platform.</p></div>
  <div class="language-stack">
    <article><div><span>Input</span><h3>CUDA C++</h3></div><code>__global__ void vector_add(…)</code><p>Clang analyzes the bounded FP32 vector-add source shape.</p></article>
    <article><div><span>Compiler &amp; runtime</span><h3>Rust</h3></div><code>Operation::Add</code><p>Owns the frontend, IR, verification, lowering and runtime.</p></article>
    <article><div><span>Native boundary</span><h3>C</h3></div><code>cuda_npu_add(a, b, out + 1);</code><p>Connects generated target entries and host interfaces to native execution.</p></article>
    <article><div><span>Tooling</span><h3>Python</h3></div><span class="tooling-role">Export · Measure · Verify</span><p>Supports model export, evidence checks and benchmark workflows.</p></article>
  </div>
</section>
<section class="container section" id="cuda-contract"><div class="section-head"><h2>Small by design.<br><span>Explicit by contract.</span></h2><p>Standalone CUDA v0 is verified for source import, CPU execution and Hexagon v75 simulation.</p></div><div class="contract-layout">{kernel}<dl class="spec"><div class="spec-row"><dt>Source</dt><dd>One FP32 vector-add kernel with two inputs and one output.</dd></div><div class="spec-row"><dt>Launch</dt><dd>1D indexing; checked extents and buffer bindings.</dd></div><div class="spec-row"><dt>Numerics</dt><dd>StrictF32. No implicit precision changes.</dd></div><div class="spec-row"><dt>Rejection</dt><dd>Diagnostics for unsupported constructs, including atomics, barriers and warp operations.</dd></div></dl></div></section>
<section class="container section"><div class="section-head"><h2>Know the boundaries.</h2><p>Kernel translation, host compatibility and model execution have different support contracts.</p></div><details><summary>Is it a drop-in replacement for CUDA?</summary><p>No. V0 imports standalone kernels. Phase 4 has separate host adapters.</p></details><details><summary>Are LLVM and QNN programming languages?</summary><p>No. LLVM compiles native code. QNN is a separate, unfinished lowering route.</p></details><details><summary>What comes after vector add?</summary><p>Inference is active. Broader workloads and hardware require later qualification.</p></details><p class="note"><a href="progress.html">Follow the implementation roadmap</a></p></section>''')

print('Built three pages. No Markdown download links.')
