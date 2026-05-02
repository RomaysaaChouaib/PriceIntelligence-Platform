import sys
sys.path.insert(0, '.')
from data_mining.pipelines.pipeline import PriceIntelligencePipeline

pipeline = PriceIntelligencePipeline()  
results  = pipeline.run()
print("\nTerminé !")