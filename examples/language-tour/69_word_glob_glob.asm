; ZAX lowered .asm trace
; range: $0100..$2012 (end exclusive)

; func word_glob_glob begin
word_glob_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
ld de, glob_words              ; 010C: 11 00 00
ld hl, (glob_idx_word)         ; 010F: 2A 00 00
add HL, HL                     ; 0112: 29
add HL, DE                     ; 0113: 19
ld E, (HL)                     ; 0114: 5E
inc HL                         ; 0115: 23
ld D, (HL)                     ; 0116: 56
ld L, E                        ; 0117: 6B
ld H, D                        ; 0118: 62
pop DE                         ; 0119: D1
push DE                        ; 011A: D5
push HL                        ; 011B: E5
ld de, glob_words              ; 011C: 11 00 00
ld hl, (glob_idx_word)         ; 011F: 2A 00 00
add HL, HL                     ; 0122: 29
add HL, DE                     ; 0123: 19
pop DE                         ; 0124: D1
ld (HL), E                     ; 0125: 73
inc HL                         ; 0126: 23
ld (HL), D                     ; 0127: 72
pop DE                         ; 0128: D1
__zax_epilogue_0:
pop DE                         ; 0129: D1
pop BC                         ; 012A: C1
pop AF                         ; 012B: F1
ld SP, IX                      ; 012C: DD F9
pop IX                         ; 012E: DD E1
ret                            ; 0130: C9
; func main begin
; func word_glob_glob end
main:
push IX                        ; 0131: DD E5
ld IX, $0000                   ; 0133: DD 21 00 00
add IX, SP                     ; 0137: DD 39
push AF                        ; 0139: F5
push BC                        ; 013A: C5
push DE                        ; 013B: D5
push HL                        ; 013C: E5
call word_glob_glob            ; 013D: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0140: E1
pop DE                         ; 0141: D1
pop BC                         ; 0142: C1
pop AF                         ; 0143: F1
ld SP, IX                      ; 0144: DD F9
pop IX                         ; 0146: DD E1
ret                            ; 0148: C9
; func main end

; symbols:
; label word_glob_glob = $0100
; label __zax_epilogue_0 = $0129
; label main = $0131
; label __zax_epilogue_1 = $0140
; data glob_words = $2000
; data glob_idx_word = $2010
