import os

import modal

app = modal.App("libroai-vllm")

# 0 = escala a cero si no hay trafico (barato; primer mensaje tras horas = arranque lento).
# 1 = siempre al menos un contenedor con modelo en GPU (primer mensaje rapido; pagas GPU en reposo).
# Al desplegar: set LIBRO_MODAL_MIN_CONTAINERS=1 en tu entorno, o edita el default abajo.
_MIN_CONTAINERS = int(os.environ.get("LIBRO_MODAL_MIN_CONTAINERS", "1"))

MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"
SERVED_MODEL_NAME = "llm"
VLLM_PORT = 8000

# vLLM 0.6.3.post1 exige transformers>=4.45.2; versiones muy nuevas rompen Qwen2Tokenizer en vLLM 0.6.x.
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "vllm==0.6.3.post1",
        "transformers==4.45.2",
    )
)


@app.function(
    image=image,
    gpu="L4",
    timeout=60 * 60,
    scaledown_window=15 * 60,
)
@modal.web_server(port=VLLM_PORT, startup_timeout=20 * 60)
def serve():
    import subprocess

    cmd = [
        "vllm",
        "serve",
        MODEL_NAME,
        "--host",
        "0.0.0.0",
        "--port",
        str(VLLM_PORT),
        "--served-model-name",
        SERVED_MODEL_NAME,
        "--gpu-memory-utilization",
        "0.90",
        "--max-model-len",
        "4096",
    ]
    subprocess.Popen(cmd)
