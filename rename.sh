#!/bin/bash

# 脚本功能：
# 1. 递归遍历所有图片（含次级文件夹），重命名为MD5前10位（保留后缀）
# 2. 每个文件夹生成pic_names.json（记录该文件夹图片名称，解决数组丢失问题）
# 3. 兼容Linux/macOS，提升容错性，确保JSON稳定生成

IMAGE_FORMATS=("jpg" "jpeg" "png" "gif" "bmp" "webp" "tiff")
JSON_FILENAME="pic_names.json"
TARGET_ROOT_DIR="."

# 检查md5工具
check_md5_tool() {
    if ! command -v md5sum &> /dev/null && ! command -v md5 &> /dev/null; then
        echo "错误：未找到md5工具（md5sum/md5），请先安装！"
        exit 1
    fi
}

# 计算文件MD5
get_file_md5() {
    local FILE="$1"
    if command -v md5sum &> /dev/null; then
        md5sum "$FILE" | awk '{print $1}'
    else
        md5 -q "$FILE"
    fi
}

# 处理单个文件夹（修复子shell数组丢失问题）
process_single_folder() {
    local FOLDER="$1"
    local TEMP_FILE=$(mktemp)  # 创建临时文件存储重命名后的图片名，规避子shell问题

    echo "开始处理文件夹：$FOLDER"

    # 切换到目标文件夹，失败则跳过
    cd "$FOLDER" || { echo "警告：无法进入文件夹 $FOLDER，跳过！"; return; }

    # 遍历所有支持的图片格式（不区分大小写）
    for FORMAT in "${IMAGE_FORMATS[@]}"; do
        # 【关键修复】用for循环替代管道while，避免子shell；或用临时文件存储结果
        while IFS= read -r -d $'\0' FILE; do
            local BASENAME_FILE=$(basename "$FILE")
            # 跳过隐藏文件
            if [[ "$BASENAME_FILE" =~ ^\. ]]; then
                continue
            fi

            # 计算MD5并提取前10位
            local MD5_PREFIX=$(get_file_md5 "$FILE")
            # local MD5_PREFIX=${MD5_VALUE:0:10}
            # 获取小写后缀
            local FILE_EXT=$(echo "$BASENAME_FILE" | awk -F . '{if (NF>1) print tolower($NF)}')
            local NEW_FILENAME="${MD5_PREFIX}.${FILE_EXT}"

            # 检查新文件名是否存在
            if [[ -f "$NEW_FILENAME" ]]; then
                echo "警告：$FOLDER 中 $NEW_FILENAME 已存在，跳过 $BASENAME_FILE"
                # 若需记录已存在的图片，取消下面注释
                # echo "$NEW_FILENAME" >> "$TEMP_FILE"
                continue
            fi

            # 执行重命名
            mv -n "$FILE" "$NEW_FILENAME"
            if [[ $? -eq 0 ]]; then
                echo "  成功：$BASENAME_FILE -> $NEW_FILENAME"
                # 将新文件名写入临时文件（规避子shell数组丢失）
                echo "$NEW_FILENAME" >> "$TEMP_FILE"
            else
                echo "  失败：无法重命名 $FOLDER/$BASENAME_FILE"
            fi
        done < <(find . -maxdepth 1 -type f \( -iname "*.$FORMAT" \) -print0)
    done

    # 从临时文件读取图片名，生成数组
    local -a RENAMED_PICS=()
    while IFS= read -r PIC; do
        [[ -n "$PIC" ]] && RENAMED_PICS+=("\"$PIC\"")
    done < "$TEMP_FILE"

    # 【放宽条件】即使无新图片，也可生成JSON（空数组），避免不生成文件
    if [[ ${#RENAMED_PICS[@]} -gt 0 ]]; then
        # 构造JSON数组
        local PICS_JSON=$(IFS=,; echo "[${RENAMED_PICS[*]}]")
    else
        # 无图片时，JSON数组为空
        local PICS_JSON="[]"
    fi

    # 【强制生成JSON】无论是否有图片，都生成JSON（可根据需求调整）
    echo "{\"folder_path\": \"$FOLDER\", \"image_names\": $PICS_JSON}" > "$JSON_FILENAME"
    if [[ $? -eq 0 ]]; then
        echo "  成功生成JSON文件：$FOLDER/$JSON_FILENAME"
    else
        echo "  失败：无权限创建 $FOLDER/$JSON_FILENAME"
    fi

    # 删除临时文件
    rm -f "$TEMP_FILE"

    # 切回上一级目录
    cd - &> /dev/null
}

# 主函数
main() {
    check_md5_tool

    # 递归遍历所有文件夹
    while IFS= read -r -d $'\0' DIR; do
        process_single_folder "$DIR"
    done < <(find "$TARGET_ROOT_DIR" -type d -print0)

    echo "====================================="
    echo "所有文件夹处理完成！"
}

# 启动脚本
main
exit 0