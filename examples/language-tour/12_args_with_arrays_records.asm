; ZAX lowered .asm trace
; range: $0100..$0196 (end exclusive)

; func read_byte_at begin
read_byte_at:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld e, (ix+disp)                ; 010B: DD 5E 04
ld d, (ix+disp+1)              ; 010E: DD 56 05
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
push HL                        ; 0114: E5
ld HL, sample_bytes            ; 0115: 21 00 00
pop DE                         ; 0118: D1
add HL, DE                     ; 0119: 19
push HL                        ; 011A: E5
pop HL                         ; 011B: E1
ld A, (hl)                     ; 011C: 7E
__zax_epilogue_0:
pop DE                         ; 011D: D1
pop BC                         ; 011E: C1
pop AF                         ; 011F: F1
ld SP, IX                      ; 0120: DD F9
pop IX                         ; 0122: DD E1
ret                            ; 0124: C9
; func read_byte_at end
; func read_word_at begin
read_word_at:
push IX                        ; 0125: DD E5
ld IX, $0000                   ; 0127: DD 21 00 00
add IX, SP                     ; 012B: DD 39
push AF                        ; 012D: F5
push BC                        ; 012E: C5
push DE                        ; 012F: D5
ld e, (ix+disp)                ; 0130: DD 5E 04
ld d, (ix+disp+1)              ; 0133: DD 56 05
ex de, hl                      ; 0136: EB
push HL                        ; 0137: E5
pop HL                         ; 0138: E1
add HL, HL                     ; 0139: 29
push HL                        ; 013A: E5
ld HL, sample_words            ; 013B: 21 00 00
pop DE                         ; 013E: D1
add HL, DE                     ; 013F: 19
push HL                        ; 0140: E5
pop HL                         ; 0141: E1
push AF                        ; 0142: F5
ld A, (HL)                     ; 0143: 7E
inc HL                         ; 0144: 23
ld H, (HL)                     ; 0145: 66
ld L, A                        ; 0146: 6F
pop AF                         ; 0147: F1
__zax_epilogue_1:
pop DE                         ; 0148: D1
pop BC                         ; 0149: C1
pop AF                         ; 014A: F1
ld SP, IX                      ; 014B: DD F9
pop IX                         ; 014D: DD E1
ret                            ; 014F: C9
; func main begin
; func read_word_at end
main:
push IX                        ; 0150: DD E5
ld IX, $0000                   ; 0152: DD 21 00 00
add IX, SP                     ; 0156: DD 39
push HL                        ; 0158: E5
push DE                        ; 0159: D5
push BC                        ; 015A: C5
push AF                        ; 015B: F5
ld HL, $0003                   ; 015C: 21 03 00
push HL                        ; 015F: E5
call read_byte_at              ; 0160: CD 00 00
inc SP                         ; 0163: 33
inc SP                         ; 0164: 33
ld HL, $0001                   ; 0165: 21 01 00
push HL                        ; 0168: E5
call read_word_at              ; 0169: CD 00 00
inc SP                         ; 016C: 33
inc SP                         ; 016D: 33
__zax_epilogue_2:
pop DE                         ; 016E: D1
pop BC                         ; 016F: C1
pop AF                         ; 0170: F1
ld e, (ix-$0002)               ; 0171: DD 5E FE
ld d, (ix-$0001)               ; 0174: DD 56 FF
ex de, hl                      ; 0177: EB
ld SP, IX                      ; 0178: DD F9
pop IX                         ; 017A: DD E1
ret                            ; 017C: C9
; func main end

; symbols:
; label read_byte_at = $0100
; label __zax_epilogue_0 = $011D
; label read_word_at = $0125
; label __zax_epilogue_1 = $0148
; label main = $0150
; label __zax_epilogue_2 = $016E
; data sample_bytes = $017E
; data sample_words = $018E
