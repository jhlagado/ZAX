; ZAX lowered .asm trace
; range: $0100..$015E (end exclusive)

; func write_pair begin
write_pair:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push HL                        ; 010B: E5
push IX                        ; 010C: DD E5
pop HL                         ; 010E: E1
push DE                        ; 010F: D5
ld DE, $0004                   ; 0110: 11 04 00
add HL, DE                     ; 0113: 19
pop DE                         ; 0114: D1
ld a, (hl)                     ; 0115: 7E
ld HL, pair_buf                ; 0116: 21 00 00
ld (hl), a                     ; 0119: 77
push IX                        ; 011A: DD E5
pop HL                         ; 011C: E1
push DE                        ; 011D: D5
ld DE, $0006                   ; 011E: 11 06 00
add HL, DE                     ; 0121: 19
pop DE                         ; 0122: D1
ld a, (hl)                     ; 0123: 7E
ld HL, pair_buf + 1            ; 0124: 21 00 00
ld (hl), a                     ; 0127: 77
__zax_epilogue_0:
pop HL                         ; 0128: E1
pop DE                         ; 0129: D1
pop BC                         ; 012A: C1
pop AF                         ; 012B: F1
ld SP, IX                      ; 012C: DD F9
pop IX                         ; 012E: DD E1
ret                            ; 0130: C9
; func read_pair_word begin
; func write_pair end
read_pair_word:
push AF                        ; 0131: F5
push BC                        ; 0132: C5
push DE                        ; 0133: D5
ld HL, pair_buf                ; 0134: 21 00 00
ld L, (hl)                     ; 0137: 6E
ld HL, pair_buf + 1            ; 0138: 21 00 00
ld H, (hl)                     ; 013B: 66
__zax_epilogue_1:
pop DE                         ; 013C: D1
pop BC                         ; 013D: C1
pop AF                         ; 013E: F1
ret                            ; 013F: C9
; func main begin
; func read_pair_word end
main:
push AF                        ; 0140: F5
push BC                        ; 0141: C5
push DE                        ; 0142: D5
push HL                        ; 0143: E5
ld HL, $0002                   ; 0144: 21 02 00
push HL                        ; 0147: E5
ld HL, $0001                   ; 0148: 21 01 00
push HL                        ; 014B: E5
call write_pair                ; 014C: CD 00 00
inc SP                         ; 014F: 33
inc SP                         ; 0150: 33
inc SP                         ; 0151: 33
inc SP                         ; 0152: 33
ld A, (pair_buf)               ; 0153: 3A 00 00
call read_pair_word            ; 0156: CD 00 00
__zax_epilogue_2:
pop HL                         ; 0159: E1
pop DE                         ; 015A: D1
pop BC                         ; 015B: C1
pop AF                         ; 015C: F1
ret                            ; 015D: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $0128
; label read_pair_word = $0131
; label __zax_epilogue_1 = $013C
; label main = $0140
; label __zax_epilogue_2 = $0159
; var pair_buf = $015E
