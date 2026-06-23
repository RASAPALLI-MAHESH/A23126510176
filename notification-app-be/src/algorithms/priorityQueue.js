class MinHeap {
  constructor(k) {
    this.heap = [];
    this.maxSize = k;
  }

  insert(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    } else if (item.priorityScore > this.heap[0].priorityScore) {
      this.heap[0] = item;
      this.sinkDown(0);
    }
  }

  bubbleUp(index) {
    const item = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (parent.priorityScore <= item.priorityScore) break;
      this.heap[index] = parent;
      index = parentIndex;
    }
    this.heap[index] = item;
  }

  sinkDown(index) {
    const length = this.heap.length;
    const item = this.heap[index];
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swapIndex = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (leftChild.priorityScore < item.priorityScore) {
          swapIndex = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (
          (swapIndex === null && rightChild.priorityScore < item.priorityScore) ||
          (swapIndex !== null && rightChild.priorityScore < leftChild.priorityScore)
        ) {
          swapIndex = rightChildIndex;
        }
      }

      if (swapIndex === null) break;
      this.heap[index] = this.heap[swapIndex];
      index = swapIndex;
    }
    this.heap[index] = item;
  }

  toArray() {
    return [...this.heap].sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

function getTopK(notifications, k) {
  if (!notifications || notifications.length === 0) return [];
  const minHeap = new MinHeap(k);
  for (const notif of notifications) {
    minHeap.insert(notif);
  }
  return minHeap.toArray();
}

module.exports = { getTopK };
