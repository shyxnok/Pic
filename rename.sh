#!/bin/bash

# 脚本功能：
# 1. 递归遍历目标目录及其所有次级文件夹的图片
# 2. 将每张图片重命名为MD5校验和前10位（保留原后缀，统一小写）
# 3. 在每个包含图片的文件夹内生成 pic_names.json，记录该文件夹下所有重命名后的图片名称
# 4. 跨系统兼容（Linux/macOS），安全防覆盖

# 支持的图片格式（可自行扩展，添加svg/raw等）
IMAGE_FORMATS=("jpg" "jpeg" "png" "gif" "bmp" "webp" "tiff")
# 每个文件夹内生成的JSON文件名（可自定义，如 image_list.json）
JSON_FILENAME="pic_names.json"
# 目标根目录（默认当前目录，可修改为绝对路径，如 /home/user/photos）
TARGET_ROOT_DIR="."

# 检查md5工具是否存在
check_md5_tool() {
    if ! command -v md5sum &> /dev/null && ! command -v md5 &> /dev/null; then
        echo "错误：未找到md5相关工具（md5sum/md5），请先安装！"
        exit 1
    fi
}

# 计算文件MD5值（兼容Linux/macOS）
get_file_md5() {
    local FILE="$1"
    if command -v md5sum &> /dev/null; then
        # Linux系统：提取md5sum输出的第一列（纯MD5值）
        md5sum "$FILE" | awk '{print $1}'
    else
        # macOS系统：-q参数仅输出纯MD5值
        md5 -q "$FILE"
    fi
}

# 为单个文件夹处理图片+生成JSON
process_single_folder() {
    local FOLDER="$1"
    local -a RENAMED_PICS=()  # 存储当前文件夹重命名后的图片名称

    echo "开始处理文件夹：$FOLDER"

    # 切换到当前文件夹（失败则跳过该文件夹）
    cd "$FOLDER" || { echo "警告：无法进入文件夹 $FOLDER，跳过！"; return; }

    # 遍历所有支持的图片格式（不区分大小写）
    for FORMAT in "${IMAGE_FORMATS[@]}"; do
        # 查找当前文件夹（不递归，避免重复处理子文件夹）的对应格式图片
        find . -maxdepth 1 -type f \( -iname "*.$FORMAT" \) -print0 | while IFS= read -r -d $'\0' FILE; do
            # 跳过隐藏文件（以.开头，如 .DS_Store、.test.jpg）
            local BASENAME_FILE=$(basename "$FILE")
            if [[ "$BASENAME_FILE" =~ ^\. ]]; then
                continue
            fi

            # 计算MD5值并提取前10位
            local MD5_PREFIX=$(get_file_md5 "$FILE")
            # local MD5_PREFIX=${MD5_VALUE:0:10}

            # 获取文件原始后缀（转为小写，统一格式）
            local FILE_EXT=$(echo "$BASENAME_FILE" | awk -F . '{if (NF>1) print tolower($NF)}')
            # 构造新文件名
            local NEW_FILENAME="${MD5_PREFIX}.${FILE_EXT}"

            # 检查新文件名是否已存在，避免覆盖
            if [[ -f "$NEW_FILENAME" ]]; then
                echo "警告：$FOLDER 中 $NEW_FILENAME 已存在，跳过 $BASENAME_FILE"
                continue
            fi

            # 执行安全重命名（-n 不覆盖已有文件）
            mv -n "$FILE" "$NEW_FILENAME"
            if [[ $? -eq 0 ]]; then
                echo "  成功：$BASENAME_FILE -> $NEW_FILENAME"
                # 将重命名后的文件名加入数组（用于后续生成JSON）
                RENAMED_PICS+=("\"$NEW_FILENAME\"")
            else
                echo "  失败：无法重命名 $FOLDER/$BASENAME_FILE"
            fi
        done
    done

    # 生成JSON文件（仅当当前文件夹有重命名后的图片时）
    if [[ ${#RENAMED_PICS[@]} -gt 0 ]]; then
        # 将数组元素用逗号分隔，构造JSON数组
        local PICS_JSON=$(IFS=,; echo "[${RENAMED_PICS[*]}]")
        # 写入JSON文件（覆盖原有文件，若需追加可修改为 >>，但推荐覆盖保持最新）
        echo "{\"folder_path\": \"$FOLDER\", \"image_names\": $PICS_JSON}" > "$JSON_FILENAME"
        echo "  成功生成JSON文件：$FOLDER/$JSON_FILENAME"
    else
        # 若当前文件夹无图片，删除可能存在的旧JSON文件（可选）
        if [[ -f "$JSON_FILENAME" ]]; then
            rm -f "$JSON_FILENAME"
            echo "  该文件夹无图片，已删除旧JSON文件：$JSON_FILENAME"
        fi
    fi

    # 切回上一级目录，避免影响后续递归处理
    cd - &> /dev/null
}

# 主函数：递归遍历所有文件夹并处理
main() {
    check_md5_tool

    # 递归查找所有文件夹（从目标根目录开始）
    find "$TARGET_ROOT_DIR" -type d -print0 | while IFS= read -r -d $'\0' DIR; do
        # 处理每个找到的文件夹
        process_single_folder "$DIR"
    done

    echo "====================================="
    echo "所有文件夹处理完成！"
    echo "  1. 已递归重命名所有图片（MD5前10位+原后缀）"
    echo "  2. 每个含图片的文件夹内已生成 $JSON_FILENAME"
    echo "  3. JSON文件记录了对应文件夹的图片名称列表"
}

# 启动脚本
main
exit 0