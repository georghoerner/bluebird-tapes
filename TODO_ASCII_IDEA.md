the idea is basically:
give me all possible ascii symbols
for each region/field of the image, each part of the image that is supposed to be represented by a single character, try to find the best fitting character in terms of contrast:
background color and character color should be controllable?
think about quantization of colors and background colors, maybe in an iterative process: first find the bestest representation, list all colors, cluster (2D (or 3D?) cluster, because hue and value/brightness are the two axis?) the points to a variable number
do clustering for both character color and background color

have a look at different character encodings, see how well different pictures are represented by them
idea: animations, sort of like a camera lens sharpening or lines scanning by going through a series of different character encodings each with a better "resolution" (thought is: more different characters to choose from, more visual encoding abilities, more information in each "ascii pixel" = field/image area)
