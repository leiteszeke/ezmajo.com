(function (global, factory) {
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		define(factory);
	} else {
		global = typeof globalThis !== 'undefined' ? globalThis : global || self;
		global.Chart = factory();
	}
})(this, (function () { 'use strict';

// Core functionality of Chart.js
const Chart = function(context, config) {
  this.canvas = context.canvas || context;
  this.ctx = context;
  this.config = config;
  this.data = config.data;
  this.options = config.options;
  this.tooltip = {
    x: 0,
    y: 0,
    opacity: 0,
    dataPoint: null
  };
  this.initialize();
};

Chart.prototype.initialize = function() {
  if (this.config.type === 'doughnut') {
    this.setupEventListeners();
    this.drawDoughnutChart();
  }
};

Chart.prototype.setupEventListeners = function() {
  this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
  this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
};

Chart.prototype.handleMouseMove = function(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const dataPoint = this.getDataPointAtPosition(x, y);
    if (dataPoint) {
        this.tooltip.x = x;
        this.tooltip.y = y;
        this.tooltip.opacity = 1;
        this.tooltip.dataPoint = dataPoint;
        this.drawDoughnutChart();
    } else {
        this.handleMouseLeave();
    }
};

Chart.prototype.handleMouseLeave = function() {
  this.tooltip.opacity = 0;
  this.tooltip.dataPoint = null;
  this.drawDoughnutChart();
};

Chart.prototype.getDataPointAtPosition = function(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(this.canvas.width, this.canvas.height) / 2;
    
    // Convert mouse position to canvas coordinates
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Calculate distance from center
    const dx = canvasX - centerX;
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if point is within donut area
    const cutoutRadius = radius * (this.options.cutout || 0) / 100;
    if (distance > radius || distance < cutoutRadius) {
        return null;
    }
    
    // Calculate angle
    let angle = Math.atan2(dy, dx);
    if (angle < 0) {
        angle += 2 * Math.PI;
    }
    angle = (angle + Math.PI / 2) % (2 * Math.PI);
    
    // Find which segment the point is in
    const total = this.data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    let currentAngle = 0;
    
    for (let i = 0; i < this.data.datasets[0].data.length; i++) {
        const sliceAngle = (2 * Math.PI * this.data.datasets[0].data[i]) / total;
        if (angle >= currentAngle && angle <= currentAngle + sliceAngle) {
            return {
                index: i,
                value: this.data.datasets[0].data[i],
                label: this.data.labels[i]
            };
        }
        currentAngle += sliceAngle;
    }
    
    return null;
};

Chart.prototype.drawTooltip = function() {
    if (!this.tooltip.opacity || !this.tooltip.dataPoint) return;
    
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const dataPoint = this.tooltip.dataPoint;
    const total = this.data.datasets[0].data.reduce((t, i) => t + i, 0);
    const percentage = ((dataPoint.value / total) * 100).toFixed(0);
    
    // Calculate tooltip dimensions
    ctx.save();
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';
    const percentText = `${percentage}%`;
    const percentWidth = ctx.measureText(percentText).width;
    
    ctx.font = '13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';
    const labelText = `${dataPoint.label}: ${dataPoint.value}`;
    const labelWidth = ctx.measureText(labelText).width;
    
    const padding = 12;
    const tooltipWidth = Math.max(percentWidth, labelWidth) + (padding * 2);
    const tooltipHeight = 45;
    
    // Calculate tooltip position in screen coordinates
    let tooltipX = this.tooltip.x - (tooltipWidth / 2);
    let tooltipY = this.tooltip.y - tooltipHeight - 10;
    
    // Adjust for screen boundaries
    if (tooltipX < 0) {
        tooltipX = 0;
    } else if (tooltipX + tooltipWidth > rect.width) {
        tooltipX = rect.width - tooltipWidth;
    }
    
    if (tooltipY < 0) {
        tooltipY = this.tooltip.y + 10;
    }
    
    // Convert to canvas coordinates
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    tooltipX *= scaleX;
    tooltipY *= scaleY;
    
    // Draw tooltip background with solid color
    ctx.fillStyle = '#4E4B66';  // Solid dark background color
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth * scaleX, tooltipHeight * scaleY, 4);
    ctx.fill();
    
    // Draw percentage with corresponding color
    const tooltipColors = {
        'Accepted': '#33A881',      // Solid green
        'Rejected': '#EC4A5E',      // Solid red
        'Partially Accepted': '#4493F9'  // Solid blue
    };
    ctx.fillStyle = tooltipColors[dataPoint.label];
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(percentText, tooltipX + (padding * scaleX), tooltipY + (20 * scaleY));
    
    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';
    ctx.fillText(labelText, tooltipX + (padding * scaleX), tooltipY + (38 * scaleY));
    
    ctx.restore();
};

Chart.prototype.drawDoughnutChart = function() {
    const ctx = this.ctx;
    const data = this.data;
    const options = this.options;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2;
    const cutout = options.cutout ? (parseFloat(options.cutout) / 100) * radius : 0;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    let startAngle = -0.5 * Math.PI;
    
    // Chart colors aligned with admin consent chart styling
    const chartColors = {
        'Accepted': 'rgba(51, 168, 129, 0.5)',      // Light green with 0.5 opacity
        'Rejected': 'rgba(236, 74, 94, 0.5)',       // Light red with 0.5 opacity
        'Partially Accepted': 'rgba(68, 147, 249, 0.5)'  // Light blue with 0.5 opacity
    };
    
    // Tooltip colors with lighter opacity
    const tooltipColors = {
        'Accepted': 'rgba(51, 168, 129, 0.7)',      // Light green with 0.7 opacity
        'Rejected': 'rgba(236, 74, 94, 0.7)',       // Light red with 0.7 opacity
        'Partially Accepted': 'rgba(68, 147, 249, 0.7)'  // Light blue with 0.7 opacity
    };
    
    data.datasets[0].data.forEach((value, index) => {
        const sliceAngle = (2 * Math.PI * value) / total;
        const label = data.labels[index];
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.arc(centerX, centerY, cutout, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        
        // Check if this slice is being hovered
        if (this.tooltip.dataPoint && this.tooltip.dataPoint.label === label) {
            ctx.fillStyle = tooltipColors[label];
        } else {
            ctx.fillStyle = chartColors[label];
        }
        
        ctx.fill();
        startAngle += sliceAngle;
    });
    
    // Draw tooltip if active
    this.drawTooltip();
};

// Export the Chart object
return Chart;
})); 