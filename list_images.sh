#!/bin/bash

# 脚本功能：
# 1. 扫描指定文件夹的图片，获取图片名称列表
# 2. 仅当文件夹内有图片时才生成 pic_names.json
# 3. 用法：./list_images.sh <文件夹路径>

IMAGE_FORMATS=("jpg" "jpeg" "png" "gif" "bmp" "webp" "tiff")
JSON_FILENAME="pic_names.json"

# 检查参数
if [[ -z "$1" ]]; then
    echo "用法：$0 <文件夹路径>"
    exit 1
fi

TARGET_DIR="$1"

if [[ ! -d "$TARGET_DIR" ]]; then
    echo "错误：$TARGET_DIR 不是有效的文件夹"
    exit 1
fi

# 转为绝对路径
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)
echo "目标文件夹：$TARGET_DIR"

# 处理单个文件夹
process_folder() {
    local FOLDER="$1"
    local TEMP_FILE=$(mktemp)

    cd "$FOLDER" || { echo "警告：无法进入文件夹 $FOLDER，跳过！"; return 1; }

    for FORMAT in "${IMAGE_FORMATS[@]}"; do
        while IFS= read -r -d $'\0' FILE; do
            local BASENAME_FILE=$(basename "$FILE")
            if [[ "$BASENAME_FILE" =~ ^\. ]]; then
                continue
            fi
            echo "$BASENAME_FILE" >> "$TEMP_FILE"
        done < <(find . -maxdepth 1 -type f -not -name ".*" -iname "*.$FORMAT" -print0)
    done

    # 从临时文件读取图片名
    local -a PICS_LIST=()
    while IFS= read -r PIC; do
        [[ -n "$PIC" ]] && PICS_LIST+=("\"$PIC\"")
    done < "$TEMP_FILE"

    rm -f "$TEMP_FILE"

    if [[ ${#PICS_LIST[@]} -gt 0 ]]; then
        local PICS_JSON=$(IFS=,; echo "[${PICS_LIST[*]}]")
        echo "{\"folder_path\": \"$FOLDER\", \"image_names\": $PICS_JSON}" > "$JSON_FILENAME"
        echo "  已生成：$FOLDER/$JSON_FILENAME （共 ${#PICS_LIST[@]} 张图片）"
    else
        echo "  该文件夹无图片，跳过生成 JSON"
        cd - &> /dev/null
        return 0
    fi

    cd - &> /dev/null
}

process_folder "$TARGET_DIR"
echo "完成！"
exit 0