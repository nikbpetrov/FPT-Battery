/**
 * Barebones DataSaver for the FPT package
 * Users should extend this or provide their own via callbacks
 */
export class DataSaver {
	constructor(config) {
		this.disable_chunking = config.disable_chunking || false;
		this.maxChunkSize = config.maxChunkSize || 1000000;
		this.onSaveData = config.onSaveData || null;
		this.onError = config.onError || null;
	}

	async save(checkpoint, checkpointIndex, data) {
		const chunks = this.disable_chunking ? [data] : this.chunkData(data);

		console.log(
			`[FPT DataSaver] Saving ${chunks.length} chunk(s) for checkpoint: ${checkpoint}`
		);

		if (this.onSaveData) {
			try {
				await this.onSaveData(chunks, checkpoint, checkpointIndex);
			} catch (error) {
				console.error('[FPT DataSaver] Save failed:', error);
				if (this.onError) {
					this.onError(error);
				}
				throw error;
			}
		} else {
			console.log('[FPT DataSaver] Data:', {
				checkpoint,
				checkpointIndex,
				chunks: chunks.length,
				totalTrials: data.length,
			});
		}
	}

	chunkData(data) {
		const chunks = [];
		let currentChunk = [];
		let currentSize = 0;

		for (let trial of data) {
			const trialJson = JSON.stringify(trial);
			const trialSize = trialJson.length * 2;

			if (currentSize + trialSize > this.maxChunkSize && currentChunk.length > 0) {
				chunks.push(currentChunk);
				currentChunk = [trial];
				currentSize = trialSize;
			} else {
				currentChunk.push(trial);
				currentSize += trialSize;
			}
		}

		if (currentChunk.length > 0) {
			chunks.push(currentChunk);
		}

		return chunks;
	}
}
